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
