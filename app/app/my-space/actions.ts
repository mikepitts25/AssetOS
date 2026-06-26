"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isValidWindow } from "@/lib/availability";

export async function releaseSpace(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Not authorized" };

  const parking_space_id = formData.get("parking_space_id") as string;
  const starts_at = new Date(formData.get("starts_at") as string).toISOString();
  const ends_at = new Date(formData.get("ends_at") as string).toISOString();
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!parking_space_id) return { error: "No space selected" };
  if (!isValidWindow(starts_at, ends_at)) {
    return { error: "End time must be after start time" };
  }

  const supabase = createClient();

  // Confirm the caller actually holds an active assignment for this space.
  const { data: assignment } = await supabase
    .from("parking_assignments")
    .select("property_id")
    .eq("parking_space_id", parking_space_id)
    .eq("resident_id", ctx.profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (!assignment) {
    return { error: "You can only release a space assigned to you" };
  }

  const { data, error } = await supabase
    .from("space_availabilities")
    .insert({
      organization_id: ctx.organization.id,
      property_id: assignment.property_id,
      parking_space_id,
      released_by_resident_id: ctx.profile.id,
      starts_at,
      ends_at,
      status: "available",
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "availability_created",
    entityType: "space_availability",
    entityId: data.id,
  });

  revalidatePath("/app/my-space");
  revalidatePath("/app/my-reservations");
  return { success: true };
}

export async function cancelRelease(id: string) {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Not authorized" };

  const supabase = createClient();
  const { error } = await supabase
    .from("space_availabilities")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("released_by_resident_id", ctx.profile.id)
    .eq("status", "available");

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "availability_cancelled",
    entityType: "space_availability",
    entityId: id,
  });

  revalidatePath("/app/my-space");
  return { success: true };
}
