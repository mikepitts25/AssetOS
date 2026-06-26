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
