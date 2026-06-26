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
