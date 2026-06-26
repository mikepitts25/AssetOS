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
