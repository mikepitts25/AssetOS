"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isValidWindow } from "@/lib/availability";
import type { ReservationPurpose } from "@/types/domain";

/**
 * Reserve a released space. Delegates to the `reserve_space` SQL function,
 * which atomically validates the window, checks for overlaps, inserts a
 * confirmed reservation, and marks the availability as reserved.
 */
export async function createReservation(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Not authorized" };

  const availability_id = formData.get("availability_id") as string;
  const starts_at = new Date(formData.get("starts_at") as string).toISOString();
  const ends_at = new Date(formData.get("ends_at") as string).toISOString();

  if (!availability_id) return { error: "No availability selected" };
  if (!isValidWindow(starts_at, ends_at)) {
    return { error: "End time must be after start time" };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("reserve_space", {
    p_availability_id: availability_id,
    p_resident_id: ctx.profile.id,
    p_starts_at: starts_at,
    p_ends_at: ends_at,
    p_purpose: (formData.get("purpose") as ReservationPurpose) || "resident_overflow",
    p_vehicle_plate: (formData.get("vehicle_plate") as string)?.trim() || null,
    p_vehicle_make: (formData.get("vehicle_make") as string)?.trim() || null,
    p_vehicle_model: (formData.get("vehicle_model") as string)?.trim() || null,
    p_notes: (formData.get("notes") as string)?.trim() || null,
  });

  if (error) return { error: error.message };

  const reservationId = Array.isArray(data) ? data[0]?.id : data?.id;
  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "reservation_created",
    entityType: "reservation",
    entityId: reservationId,
  });

  revalidatePath("/app/my-reservations");
  revalidatePath("/app/reservations");
  return { success: true };
}

export async function cancelReservation(id: string) {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Not authorized" };

  const supabase = createClient();

  // Free the backing availability if there is one, then cancel.
  const { data: reservation } = await supabase
    .from("reservations")
    .select("availability_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return { error: error.message };

  if (reservation?.availability_id) {
    await supabase
      .from("space_availabilities")
      .update({ status: "available" })
      .eq("id", reservation.availability_id)
      .eq("status", "reserved");
  }

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "reservation_cancelled",
    entityType: "reservation",
    entityId: id,
  });

  revalidatePath("/app/my-reservations");
  revalidatePath("/app/reservations");
  return { success: true };
}
