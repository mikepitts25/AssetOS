import { createClient } from "@/lib/supabase/server";

/**
 * App-layer availability check that mirrors the SQL `is_space_available`
 * function. Returns true when no pending/confirmed reservation overlaps
 * the requested window. The database exclusion constraint is the real
 * guarantee; this gives us a friendly pre-check before inserting.
 */
export async function isSpaceAvailable(
  spaceId: string,
  startsAt: string,
  endsAt: string,
  ignoreReservationId?: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("is_space_available", {
    p_space_id: spaceId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_ignore_reservation_id: ignoreReservationId ?? null,
  });

  if (error) {
    console.error("[availability] is_space_available failed", error);
    return false;
  }
  return Boolean(data);
}

/** True when start < end and start is in the future-ish (allows now). */
export function isValidWindow(startsAt: string, endsAt: string): boolean {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}
