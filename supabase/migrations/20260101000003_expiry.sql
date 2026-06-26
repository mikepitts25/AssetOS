-- ============================================================
-- AssetOS / ParkingOS — Stale status expiry
-- ============================================================
-- Time-window queries already answer "is this active right now?", but the
-- stored `status` columns (shown in lists and badges) go stale once a record
-- passes its end time. This migration adds an idempotent function that flips
-- the terminal statuses, plus a best-effort pg_cron schedule. The same
-- function is also exposed to the service role for the /api/cron/expire-stale
-- route (Vercel Cron), so either trigger works — you only need one.
--
--   space_availabilities  available -> expired
--   visitor_passes        active    -> expired
--   reservations          confirmed -> completed
-- ============================================================

create or replace function expire_stale_records()
returns table (
  expired_availabilities integer,
  expired_visitor_passes integer,
  completed_reservations integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avail  integer;
  v_passes integer;
  v_resv   integer;
begin
  with updated as (
    update space_availabilities
       set status = 'expired', updated_at = now()
     where status = 'available' and ends_at < now()
    returning 1
  )
  select count(*) into v_avail from updated;

  with updated as (
    update visitor_passes
       set status = 'expired', updated_at = now()
     where status = 'active' and ends_at < now()
    returning 1
  )
  select count(*) into v_passes from updated;

  with updated as (
    update reservations
       set status = 'completed', updated_at = now()
     where status = 'confirmed' and ends_at < now()
    returning 1
  )
  select count(*) into v_resv from updated;

  return query select v_avail, v_passes, v_resv;
end;
$$;

comment on function expire_stale_records() is
  'Flips time-expired availabilities/visitor passes/reservations to their terminal status. Idempotent; safe to run on any schedule.';

-- The /api/cron/expire-stale route calls this with the service-role key.
grant execute on function expire_stale_records() to service_role;

-- Best-effort in-database schedule (every 15 min). Wrapped so the migration
-- still succeeds where pg_cron isn't available (e.g. a bare local Postgres);
-- in that case rely on the API route + Vercel Cron instead.
do $$
begin
  create extension if not exists pg_cron;
  if exists (select 1 from cron.job where jobname = 'expire-stale-records') then
    perform cron.unschedule('expire-stale-records');
  end if;
  perform cron.schedule(
    'expire-stale-records',
    '*/15 * * * *',
    'select expire_stale_records();'
  );
  raise notice 'pg_cron job "expire-stale-records" scheduled (every 15 minutes).';
exception
  when others then
    raise notice 'pg_cron scheduling skipped (%); use /api/cron/expire-stale instead.', sqlerrm;
end;
$$;
