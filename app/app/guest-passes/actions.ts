"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { isValidWindow } from "@/lib/availability";

export async function createVisitorPass(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Not authorized" };

  const property_id = formData.get("property_id") as string;
  const guest_name = (formData.get("guest_name") as string)?.trim();
  const starts_at = new Date(formData.get("starts_at") as string).toISOString();
  const ends_at = new Date(formData.get("ends_at") as string).toISOString();

  if (!property_id || !guest_name) {
    return { error: "Property and guest name are required" };
  }
  if (!isValidWindow(starts_at, ends_at)) {
    return { error: "End time must be after start time" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("visitor_passes")
    .insert({
      organization_id: ctx.organization.id,
      property_id,
      resident_id: ctx.profile.id,
      guest_name,
      vehicle_plate: (formData.get("vehicle_plate") as string)?.trim() || null,
      vehicle_make: (formData.get("vehicle_make") as string)?.trim() || null,
      vehicle_model: (formData.get("vehicle_model") as string)?.trim() || null,
      starts_at,
      ends_at,
      status: "active",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "visitor_pass_created",
    entityType: "visitor_pass",
    entityId: data.id,
    metadata: { guest_name },
  });

  revalidatePath("/app/guest-passes");
  return { success: true };
}

export async function cancelVisitorPass(id: string) {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Not authorized" };

  const supabase = createClient();
  const { error } = await supabase
    .from("visitor_passes")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "visitor_pass_cancelled",
    entityType: "visitor_pass",
    entityId: id,
  });

  revalidatePath("/app/guest-passes");
  return { success: true };
}
