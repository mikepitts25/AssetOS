-- ============================================================
-- AssetOS / ParkingOS — one-shot setup bundle
-- Paste this whole file into the Supabase SQL Editor and Run.
-- It applies all migrations in order, then loads demo data.
-- (Generated from supabase/migrations/* + supabase/seed.sql)
-- ============================================================

-- >>>>>>>>>>>>>>>>>>>>  supabase/migrations/20260101000000_init.sql  <<<<<<<<<<<<<<<<<<<<
-- ============================================================
-- AssetOS / ParkingOS — Initial schema
-- ============================================================
-- Multi-tenant parking management platform.
-- All tenant data is scoped by organization_id.
-- Architecture note: tables are intentionally generic enough
-- to extend toward other shared physical asset types later
-- (EV chargers, storage units, conference rooms, ...).
-- ============================================================

create extension if not exists "pgcrypto";
-- btree_gist enables exclusion constraints that mix equality (=)
-- with range overlap (&&) — used to prevent double-booking.
create extension if not exists "btree_gist";

-- ------------------------------------------------------------
-- Enum types
-- ------------------------------------------------------------
create type user_role as enum (
  'platform_admin',
  'org_admin',
  'property_manager',
  'resident'
);

create type user_status as enum (
  'active',
  'invited',
  'suspended'
);

create type parking_space_type as enum (
  'standard',
  'compact',
  'ev_charging',
  'handicap',
  'motorcycle',
  'covered',
  'garage'
);

create type parking_space_status as enum (
  'active',
  'inactive',
  'maintenance'
);

create type assignment_status as enum (
  'active',
  'ended'
);

create type availability_status as enum (
  'available',
  'reserved',
  'cancelled',
  'expired'
);

create type reservation_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'rejected'
);

create type reservation_purpose as enum (
  'resident_overflow',
  'guest',
  'temporary_vehicle',
  'other'
);

create type visitor_pass_status as enum (
  'active',
  'expired',
  'cancelled'
);

-- ------------------------------------------------------------
-- updated_at trigger function
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- organizations
-- ------------------------------------------------------------
create table organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  type         text,                         -- e.g. apartment, military_housing, office
  is_demo      boolean not null default false,
  settings     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- profiles  (one row per app user, linked to auth.users)
-- ------------------------------------------------------------
create table profiles (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid unique references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  first_name      text not null default '',
  last_name       text not null default '',
  email           text not null,
  phone           text,
  role            user_role not null default 'resident',
  status          user_status not null default 'active',
  unit_number     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_profiles_organization_id on profiles(organization_id);
create index idx_profiles_auth_user_id on profiles(auth_user_id);
create index idx_profiles_role on profiles(role);
create index idx_profiles_status on profiles(status);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- properties
-- ------------------------------------------------------------
create table properties (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  address_line_1  text,
  address_line_2  text,
  city            text,
  state_region    text,
  postal_code     text,
  country         text,
  timezone        text not null default 'UTC',
  description     text,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_properties_organization_id on properties(organization_id);

create trigger trg_properties_updated_at
  before update on properties
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- parking_spaces
-- ------------------------------------------------------------
create table parking_spaces (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id     uuid not null references properties(id) on delete cascade,
  space_number    text not null,
  label           text,
  level_or_zone   text,
  type            parking_space_type not null default 'standard',
  status          parking_space_status not null default 'active',
  is_assignable   boolean not null default true,
  is_reservable   boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (property_id, space_number)
);

create index idx_parking_spaces_organization_id on parking_spaces(organization_id);
create index idx_parking_spaces_property_id on parking_spaces(property_id);
create index idx_parking_spaces_status on parking_spaces(status);
create index idx_parking_spaces_type on parking_spaces(type);

create trigger trg_parking_spaces_updated_at
  before update on parking_spaces
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- parking_assignments  (a space's primary/reserved resident)
-- ------------------------------------------------------------
create table parking_assignments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  property_id      uuid not null references properties(id) on delete cascade,
  parking_space_id uuid not null references parking_spaces(id) on delete cascade,
  resident_id      uuid not null references profiles(id) on delete cascade,
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz,
  status           assignment_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_parking_assignments_organization_id on parking_assignments(organization_id);
create index idx_parking_assignments_property_id on parking_assignments(property_id);
create index idx_parking_assignments_parking_space_id on parking_assignments(parking_space_id);
create index idx_parking_assignments_resident_id on parking_assignments(resident_id);
create index idx_parking_assignments_status on parking_assignments(status);

-- Enforce one active assignment per parking space.
create unique index uniq_active_assignment_per_space
  on parking_assignments(parking_space_id)
  where status = 'active';

create trigger trg_parking_assignments_updated_at
  before update on parking_assignments
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- space_availabilities  (resident releases their space)
-- ------------------------------------------------------------
create table space_availabilities (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations(id) on delete cascade,
  property_id            uuid not null references properties(id) on delete cascade,
  parking_space_id       uuid not null references parking_spaces(id) on delete cascade,
  released_by_resident_id uuid not null references profiles(id) on delete cascade,
  starts_at              timestamptz not null,
  ends_at                timestamptz not null,
  status                 availability_status not null default 'available',
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint availability_time_valid check (ends_at > starts_at)
);

create index idx_space_availabilities_organization_id on space_availabilities(organization_id);
create index idx_space_availabilities_property_id on space_availabilities(property_id);
create index idx_space_availabilities_parking_space_id on space_availabilities(parking_space_id);
create index idx_space_availabilities_resident_id on space_availabilities(released_by_resident_id);
create index idx_space_availabilities_status on space_availabilities(status);
create index idx_space_availabilities_window on space_availabilities(starts_at, ends_at);

create trigger trg_space_availabilities_updated_at
  before update on space_availabilities
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- reservations
-- ------------------------------------------------------------
create table reservations (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  property_id           uuid not null references properties(id) on delete cascade,
  parking_space_id      uuid not null references parking_spaces(id) on delete cascade,
  availability_id       uuid references space_availabilities(id) on delete set null,
  reserved_by_resident_id uuid not null references profiles(id) on delete cascade,
  starts_at             timestamptz not null,
  ends_at               timestamptz not null,
  status                reservation_status not null default 'pending',
  purpose               reservation_purpose not null default 'resident_overflow',
  vehicle_plate         text,
  vehicle_make          text,
  vehicle_model         text,
  notes                 text,
  -- generated range used by the exclusion constraint below
  time_range            tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint reservation_time_valid check (ends_at > starts_at)
);

create index idx_reservations_organization_id on reservations(organization_id);
create index idx_reservations_property_id on reservations(property_id);
create index idx_reservations_parking_space_id on reservations(parking_space_id);
create index idx_reservations_resident_id on reservations(reserved_by_resident_id);
create index idx_reservations_status on reservations(status);
create index idx_reservations_window on reservations(starts_at, ends_at);

-- Prevent double-booking: no two active reservations for the same
-- space can have overlapping time ranges. Cancelled/rejected/completed
-- reservations are excluded so a freed slot can be re-booked.
alter table reservations
  add constraint no_overlapping_reservations
  exclude using gist (
    parking_space_id with =,
    time_range with &&
  ) where (status in ('pending', 'confirmed'));

create trigger trg_reservations_updated_at
  before update on reservations
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- visitor_passes  (guest parking)
-- ------------------------------------------------------------
create table visitor_passes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  property_id      uuid not null references properties(id) on delete cascade,
  resident_id      uuid not null references profiles(id) on delete cascade,
  guest_name       text not null,
  vehicle_plate    text,
  vehicle_make     text,
  vehicle_model    text,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  status           visitor_pass_status not null default 'active',
  qr_code_token    text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint visitor_pass_time_valid check (ends_at > starts_at)
);

create index idx_visitor_passes_organization_id on visitor_passes(organization_id);
create index idx_visitor_passes_property_id on visitor_passes(property_id);
create index idx_visitor_passes_resident_id on visitor_passes(resident_id);
create index idx_visitor_passes_status on visitor_passes(status);

create trigger trg_visitor_passes_updated_at
  before update on visitor_passes
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- audit_logs
-- ------------------------------------------------------------
create table audit_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  action           text not null,
  entity_type      text,
  entity_id        uuid,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index idx_audit_logs_organization_id on audit_logs(organization_id);
create index idx_audit_logs_actor_profile_id on audit_logs(actor_profile_id);
create index idx_audit_logs_action on audit_logs(action);
create index idx_audit_logs_created_at on audit_logs(created_at);

-- >>>>>>>>>>>>>>>>>>>>  supabase/migrations/20260101000001_rls.sql  <<<<<<<<<<<<<<<<<<<<
-- ============================================================
-- AssetOS / ParkingOS — Row Level Security
-- ============================================================
-- Tenant isolation is enforced at the database level: a user can
-- only ever see/modify rows inside their own organization, and
-- residents can only modify rows they own.
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read profiles
-- without tripping the very policies they support).
-- ------------------------------------------------------------

-- The profile id for the currently authenticated user.
create or replace function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles where auth_user_id = auth.uid() limit 1;
$$;

-- The organization id for the currently authenticated user.
create or replace function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from profiles where auth_user_id = auth.uid() limit 1;
$$;

-- The role for the currently authenticated user.
create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() = 'platform_admin', false);
$$;

-- Org admins and property managers are the "management" tier.
create or replace function is_org_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_user_role() in ('org_admin', 'property_manager'), false);
$$;

-- ------------------------------------------------------------
-- Enable RLS on every tenant table
-- ------------------------------------------------------------
alter table organizations         enable row level security;
alter table profiles              enable row level security;
alter table properties            enable row level security;
alter table parking_spaces        enable row level security;
alter table parking_assignments   enable row level security;
alter table space_availabilities  enable row level security;
alter table reservations          enable row level security;
alter table visitor_passes        enable row level security;
alter table audit_logs            enable row level security;

-- ------------------------------------------------------------
-- organizations
-- ------------------------------------------------------------
create policy "org members read their org"
  on organizations for select
  using (id = current_org_id() or is_platform_admin());

create policy "platform admin manages orgs"
  on organizations for all
  using (is_platform_admin())
  with check (is_platform_admin());

create policy "org admin updates own org"
  on organizations for update
  using (id = current_org_id() and current_user_role() = 'org_admin')
  with check (id = current_org_id() and current_user_role() = 'org_admin');

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create policy "read profiles in same org"
  on profiles for select
  using (organization_id = current_org_id() or is_platform_admin());

create policy "user updates own profile"
  on profiles for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "managers manage org profiles"
  on profiles for all
  using (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  )
  with check (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  );

-- A brand-new authenticated user must be able to create their own
-- profile row (used by the onboarding flow).
create policy "user inserts own profile"
  on profiles for insert
  with check (auth_user_id = auth.uid());

-- ------------------------------------------------------------
-- properties
-- ------------------------------------------------------------
create policy "read properties in org"
  on properties for select
  using (organization_id = current_org_id() or is_platform_admin());

create policy "managers manage properties"
  on properties for all
  using (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  )
  with check (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  );

-- ------------------------------------------------------------
-- parking_spaces
-- ------------------------------------------------------------
create policy "read spaces in org"
  on parking_spaces for select
  using (organization_id = current_org_id() or is_platform_admin());

create policy "managers manage spaces"
  on parking_spaces for all
  using (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  )
  with check (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  );

-- ------------------------------------------------------------
-- parking_assignments
-- ------------------------------------------------------------
create policy "read assignments in org"
  on parking_assignments for select
  using (organization_id = current_org_id() or is_platform_admin());

create policy "managers manage assignments"
  on parking_assignments for all
  using (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  )
  with check (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  );

-- ------------------------------------------------------------
-- space_availabilities
-- Residents manage only releases of spaces they own.
-- ------------------------------------------------------------
create policy "read availabilities in org"
  on space_availabilities for select
  using (organization_id = current_org_id() or is_platform_admin());

create policy "managers manage availabilities"
  on space_availabilities for all
  using (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  )
  with check (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  );

create policy "resident creates own release"
  on space_availabilities for insert
  with check (
    organization_id = current_org_id()
    and released_by_resident_id = current_profile_id()
  );

create policy "resident updates own release"
  on space_availabilities for update
  using (released_by_resident_id = current_profile_id())
  with check (released_by_resident_id = current_profile_id());

-- ------------------------------------------------------------
-- reservations
-- Residents manage only their own reservations.
-- ------------------------------------------------------------
create policy "read reservations in org"
  on reservations for select
  using (organization_id = current_org_id() or is_platform_admin());

create policy "managers manage reservations"
  on reservations for all
  using (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  )
  with check (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  );

create policy "resident creates own reservation"
  on reservations for insert
  with check (
    organization_id = current_org_id()
    and reserved_by_resident_id = current_profile_id()
  );

create policy "resident updates own reservation"
  on reservations for update
  using (reserved_by_resident_id = current_profile_id())
  with check (reserved_by_resident_id = current_profile_id());

-- ------------------------------------------------------------
-- visitor_passes
-- Residents manage only their own passes.
-- ------------------------------------------------------------
create policy "read visitor passes in org"
  on visitor_passes for select
  using (organization_id = current_org_id() or is_platform_admin());

create policy "managers manage visitor passes"
  on visitor_passes for all
  using (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  )
  with check (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  );

create policy "resident creates own visitor pass"
  on visitor_passes for insert
  with check (
    organization_id = current_org_id()
    and resident_id = current_profile_id()
  );

create policy "resident updates own visitor pass"
  on visitor_passes for update
  using (resident_id = current_profile_id())
  with check (resident_id = current_profile_id());

-- ------------------------------------------------------------
-- audit_logs  (read within org; inserts happen via service role)
-- ------------------------------------------------------------
create policy "read audit logs in org"
  on audit_logs for select
  using (
    (organization_id = current_org_id() and is_org_manager())
    or is_platform_admin()
  );

create policy "members insert audit logs in org"
  on audit_logs for insert
  with check (organization_id = current_org_id());

-- >>>>>>>>>>>>>>>>>>>>  supabase/migrations/20260101000002_availability.sql  <<<<<<<<<<<<<<<<<<<<
-- ============================================================
-- AssetOS / ParkingOS — Availability & reservation utilities
-- ============================================================
-- Database-level helpers used by the app to safely create
-- reservations without double-booking.
-- ============================================================

-- Is a given space free for [p_starts_at, p_ends_at)?
-- "Free" means: no overlapping pending/confirmed reservation,
-- ignoring an optional reservation id (useful when editing).
create or replace function is_space_available(
  p_space_id   uuid,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_ignore_reservation_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from reservations r
    where r.parking_space_id = p_space_id
      and r.status in ('pending', 'confirmed')
      and (p_ignore_reservation_id is null or r.id <> p_ignore_reservation_id)
      and r.time_range && tstzrange(p_starts_at, p_ends_at, '[)')
  );
$$;

-- Does an availability window fully cover the requested time range
-- and is it still open for booking?
create or replace function availability_covers(
  p_availability_id uuid,
  p_starts_at       timestamptz,
  p_ends_at         timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from space_availabilities a
    where a.id = p_availability_id
      and a.status = 'available'
      and a.starts_at <= p_starts_at
      and a.ends_at   >= p_ends_at
  );
$$;

-- Atomically create a reservation against an availability window.
-- Confirms automatically when the slot is free; raises otherwise.
-- Marks the backing availability as reserved.
create or replace function reserve_space(
  p_availability_id uuid,
  p_resident_id     uuid,
  p_starts_at       timestamptz,
  p_ends_at         timestamptz,
  p_purpose         reservation_purpose default 'resident_overflow',
  p_vehicle_plate   text default null,
  p_vehicle_make    text default null,
  p_vehicle_model   text default null,
  p_notes           text default null
)
returns reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avail   space_availabilities%rowtype;
  v_result  reservations%rowtype;
begin
  -- Lock the availability row to serialize concurrent bookings.
  select * into v_avail
  from space_availabilities
  where id = p_availability_id
  for update;

  if not found then
    raise exception 'Availability % not found', p_availability_id;
  end if;

  if v_avail.status <> 'available' then
    raise exception 'This space is no longer available';
  end if;

  if not (v_avail.starts_at <= p_starts_at and v_avail.ends_at >= p_ends_at) then
    raise exception 'Requested time is outside the released window';
  end if;

  if not is_space_available(v_avail.parking_space_id, p_starts_at, p_ends_at) then
    raise exception 'This space is already reserved for that time';
  end if;

  insert into reservations (
    organization_id, property_id, parking_space_id, availability_id,
    reserved_by_resident_id, starts_at, ends_at, status, purpose,
    vehicle_plate, vehicle_make, vehicle_model, notes
  )
  values (
    v_avail.organization_id, v_avail.property_id, v_avail.parking_space_id,
    v_avail.id, p_resident_id, p_starts_at, p_ends_at, 'confirmed', p_purpose,
    p_vehicle_plate, p_vehicle_make, p_vehicle_model, p_notes
  )
  returning * into v_result;

  update space_availabilities
  set status = 'reserved'
  where id = v_avail.id;

  return v_result;
end;
$$;

-- >>>>>>>>>>>>>>>>>>>>  supabase/seed.sql  <<<<<<<<<<<<<<<<<<<<
-- ============================================================
-- AssetOS / ParkingOS — Demo seed data
-- ============================================================
-- Run automatically by `supabase db reset` (local), or manually:
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Creates auth users so you can sign in immediately.
-- Demo password for every user:  Password123!
--
--   mike@assetos.demo    — org_admin
--   sarah@assetos.demo   — property_manager
--   alex@assetos.demo    — resident
--   maria@assetos.demo   — resident
--   david@assetos.demo   — resident
-- ============================================================

-- Stable UUIDs so we can wire relationships by hand.
-- Organization
--   org:   11111111-1111-1111-1111-111111111111
-- Profiles
--   mike:  a0000000-0000-0000-0000-000000000001
--   sarah: a0000000-0000-0000-0000-000000000002
--   alex:  a0000000-0000-0000-0000-000000000003
--   maria: a0000000-0000-0000-0000-000000000004
--   david: a0000000-0000-0000-0000-000000000005

begin;

-- ------------------------------------------------------------
-- Auth users (local dev). Passwords hashed with pgcrypto bcrypt.
-- ------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'mike@assetos.demo',  crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Mike","last_name":"Pitts"}'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sarah@assetos.demo', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Sarah","last_name":"Miller"}'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'alex@assetos.demo',  crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Alex","last_name":"Johnson"}'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'maria@assetos.demo', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Maria","last_name":"Rodriguez"}'),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'david@assetos.demo', crypt('Password123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"David","last_name":"Kim"}')
on conflict (id) do nothing;

-- Email identities (required by Supabase Auth for email login).
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
values
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', '{"sub":"a0000000-0000-0000-0000-000000000001","email":"mike@assetos.demo"}',  'email', 'mike@assetos.demo',  now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', '{"sub":"a0000000-0000-0000-0000-000000000002","email":"sarah@assetos.demo"}', 'email', 'sarah@assetos.demo', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', '{"sub":"a0000000-0000-0000-0000-000000000003","email":"alex@assetos.demo"}',  'email', 'alex@assetos.demo',  now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', '{"sub":"a0000000-0000-0000-0000-000000000004","email":"maria@assetos.demo"}', 'email', 'maria@assetos.demo', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', '{"sub":"a0000000-0000-0000-0000-000000000005","email":"david@assetos.demo"}', 'email', 'david@assetos.demo', now(), now(), now())
on conflict do nothing;

-- ------------------------------------------------------------
-- Organization
-- ------------------------------------------------------------
insert into organizations (id, name, slug, type, is_demo)
values ('11111111-1111-1111-1111-111111111111', 'AssetOS Demo Community', 'assetos-demo', 'mixed', true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Profiles
-- ------------------------------------------------------------
insert into profiles (id, auth_user_id, organization_id, first_name, last_name, email, phone, role, status, unit_number)
values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Mike',  'Pitts',     'mike@assetos.demo',  '+1-555-0101', 'org_admin',        'active', null),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Sarah', 'Miller',    'sarah@assetos.demo', '+1-555-0102', 'property_manager', 'active', null),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Alex',  'Johnson',   'alex@assetos.demo',  '+1-555-0103', 'resident',         'active', 'A-204'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Maria', 'Rodriguez', 'maria@assetos.demo', '+1-555-0104', 'resident',         'active', 'B-110'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'David', 'Kim',       'david@assetos.demo', '+1-555-0105', 'resident',         'active', 'C-301')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Properties
-- ------------------------------------------------------------
insert into properties (id, organization_id, name, address_line_1, city, state_region, postal_code, country, timezone, description)
values
  ('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Stuttgart Heights Apartments', 'Königstraße 12', 'Stuttgart', 'Baden-Württemberg', '70173', 'DE', 'Europe/Berlin', 'A 180-unit residential community with covered and surface parking.'),
  ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'USAG Housing Demo',           '100 Patch Barracks',    'Stuttgart', 'Baden-Württemberg', '70569', 'DE', 'Europe/Berlin', 'Military family housing with assigned and visitor parking.'),
  ('c0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Acme Hybrid Office Campus',   '500 Innovation Way',    'Austin',    'TX',                '78701', 'US', 'America/Chicago', 'Hybrid office campus with flex desks and shared parking.')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Parking spaces (30+ across the three properties)
-- ------------------------------------------------------------
-- Stuttgart Heights: covered garage levels + surface
insert into parking_spaces (organization_id, property_id, space_number, label, level_or_zone, type, status, is_assignable, is_reservable)
select '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001',
       'G-' || lpad(g::text, 2, '0'),
       'Garage spot ' || g,
       'Level P1',
       (array['standard','standard','compact','ev_charging','covered','motorcycle'])[1 + (g % 6)]::parking_space_type,
       'active', true, true
from generate_series(1, 14) g;

-- USAG Housing: surface lots, several handicap + ev
insert into parking_spaces (organization_id, property_id, space_number, label, level_or_zone, type, status, is_assignable, is_reservable)
select '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000002',
       'H-' || lpad(g::text, 2, '0'),
       'Lot B spot ' || g,
       'Zone B',
       (array['standard','standard','handicap','ev_charging','standard','compact'])[1 + (g % 6)]::parking_space_type,
       'active', true, true
from generate_series(1, 10) g;

-- Acme Office: garage + visitor
insert into parking_spaces (organization_id, property_id, space_number, label, level_or_zone, type, status, is_assignable, is_reservable)
select '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000003',
       'O-' || lpad(g::text, 2, '0'),
       'Office garage ' || g,
       'Level 2',
       (array['standard','ev_charging','covered','standard','compact','garage'])[1 + (g % 6)]::parking_space_type,
       (case when g = 8 then 'maintenance' else 'active' end)::parking_space_status,
       true, true
from generate_series(1, 8) g;

-- ------------------------------------------------------------
-- Assignments — give residents primary spaces
-- ------------------------------------------------------------
-- Alex -> Stuttgart G-01, Maria -> Stuttgart G-02, David -> USAG H-01
insert into parking_assignments (organization_id, property_id, parking_space_id, resident_id, starts_at, status)
select p.organization_id, p.property_id, p.id, 'b0000000-0000-0000-0000-000000000003', now() - interval '90 days', 'active'
from parking_spaces p where p.property_id = 'c0000000-0000-0000-0000-000000000001' and p.space_number = 'G-01';

insert into parking_assignments (organization_id, property_id, parking_space_id, resident_id, starts_at, status)
select p.organization_id, p.property_id, p.id, 'b0000000-0000-0000-0000-000000000004', now() - interval '60 days', 'active'
from parking_spaces p where p.property_id = 'c0000000-0000-0000-0000-000000000001' and p.space_number = 'G-02';

insert into parking_assignments (organization_id, property_id, parking_space_id, resident_id, starts_at, status)
select p.organization_id, p.property_id, p.id, 'b0000000-0000-0000-0000-000000000005', now() - interval '45 days', 'active'
from parking_spaces p where p.property_id = 'c0000000-0000-0000-0000-000000000002' and p.space_number = 'H-01';

-- ------------------------------------------------------------
-- Availability — residents release their spaces for upcoming dates
-- ------------------------------------------------------------
-- Alex releases G-01 for the next week
insert into space_availabilities (organization_id, property_id, parking_space_id, released_by_resident_id, starts_at, ends_at, status, notes)
select p.organization_id, p.property_id, p.id, 'b0000000-0000-0000-0000-000000000003',
       date_trunc('day', now()) + interval '1 day' + interval '8 hours',
       date_trunc('day', now()) + interval '6 days' + interval '18 hours',
       'available', 'Out of town for the week.'
from parking_spaces p where p.property_id = 'c0000000-0000-0000-0000-000000000001' and p.space_number = 'G-01';

-- Maria releases G-02 for a weekend
insert into space_availabilities (organization_id, property_id, parking_space_id, released_by_resident_id, starts_at, ends_at, status, notes)
select p.organization_id, p.property_id, p.id, 'b0000000-0000-0000-0000-000000000004',
       date_trunc('day', now()) + interval '2 days' + interval '6 hours',
       date_trunc('day', now()) + interval '4 days' + interval '20 hours',
       'available', 'Traveling this weekend.'
from parking_spaces p where p.property_id = 'c0000000-0000-0000-0000-000000000001' and p.space_number = 'G-02';

-- David releases H-01 (already past — expired)
insert into space_availabilities (organization_id, property_id, parking_space_id, released_by_resident_id, starts_at, ends_at, status, notes)
select p.organization_id, p.property_id, p.id, 'b0000000-0000-0000-0000-000000000005',
       now() - interval '10 days', now() - interval '7 days', 'expired', 'Past release.'
from parking_spaces p where p.property_id = 'c0000000-0000-0000-0000-000000000002' and p.space_number = 'H-01';

-- ------------------------------------------------------------
-- Reservations — a mix of statuses
-- ------------------------------------------------------------
-- Maria reserves Alex's released G-01 for two days (confirmed)
insert into reservations (organization_id, property_id, parking_space_id, availability_id, reserved_by_resident_id, starts_at, ends_at, status, purpose, vehicle_plate, vehicle_make, vehicle_model, notes)
select a.organization_id, a.property_id, a.parking_space_id, a.id, 'b0000000-0000-0000-0000-000000000004',
       a.starts_at, a.starts_at + interval '2 days', 'confirmed', 'resident_overflow', 'S-AB 1234', 'Volkswagen', 'Golf', 'Need a spot while visitors use mine.'
from space_availabilities a
join parking_spaces p on p.id = a.parking_space_id
where p.space_number = 'G-01' and a.status = 'available'
limit 1;

-- David reserved something previously (completed)
insert into reservations (organization_id, property_id, parking_space_id, reserved_by_resident_id, starts_at, ends_at, status, purpose, vehicle_plate, vehicle_make, vehicle_model)
select p.organization_id, p.property_id, p.id, 'b0000000-0000-0000-0000-000000000005',
       now() - interval '9 days', now() - interval '8 days', 'completed', 'temporary_vehicle', 'S-CD 5678', 'BMW', '3 Series'
from parking_spaces p where p.property_id = 'c0000000-0000-0000-0000-000000000002' and p.space_number = 'H-02';

-- Alex made a reservation then cancelled it
insert into reservations (organization_id, property_id, parking_space_id, reserved_by_resident_id, starts_at, ends_at, status, purpose, vehicle_plate, notes)
select p.organization_id, p.property_id, p.id, 'b0000000-0000-0000-0000-000000000003',
       now() + interval '12 days', now() + interval '13 days', 'cancelled', 'guest', 'S-EF 9012', 'Plans changed.'
from parking_spaces p where p.property_id = 'c0000000-0000-0000-0000-000000000001' and p.space_number = 'G-05';

-- ------------------------------------------------------------
-- Visitor passes — active + expired
-- ------------------------------------------------------------
insert into visitor_passes (organization_id, property_id, resident_id, guest_name, vehicle_plate, vehicle_make, vehicle_model, starts_at, ends_at, status)
values
  ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Jordan Lee',   'S-GH 3456', 'Audi',   'A4',    now() - interval '2 hours', now() + interval '1 day', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'Pat Nguyen',   'S-IJ 7890', 'Tesla',  'Model 3', now() + interval '1 day', now() + interval '3 days', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005', 'Chris Walker', 'S-KL 2345', 'Ford',   'Focus',   now() - interval '10 days', now() - interval '9 days', 'expired');

-- ------------------------------------------------------------
-- Audit log sample
-- ------------------------------------------------------------
insert into audit_logs (organization_id, actor_profile_id, action, entity_type, metadata)
values
  ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000002', 'property_created',     'property', '{"name":"Stuttgart Heights Apartments"}'),
  ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000003', 'availability_created', 'space_availability', '{"space":"G-01"}'),
  ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000004', 'reservation_created',  'reservation', '{"space":"G-01"}');

commit;

