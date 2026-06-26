"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";
import type { ParkingSpaceStatus, ParkingSpaceType } from "@/types/domain";

export async function createSpace(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx || !isManager(ctx.profile.role)) return { error: "Not authorized" };

  const property_id = formData.get("property_id") as string;
  const space_number = (formData.get("space_number") as string)?.trim();
  if (!property_id || !space_number) {
    return { error: "Property and space number are required" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("parking_spaces")
    .insert({
      organization_id: ctx.organization.id,
      property_id,
      space_number,
      label: (formData.get("label") as string)?.trim() || null,
      level_or_zone: (formData.get("level_or_zone") as string)?.trim() || null,
      type: (formData.get("type") as ParkingSpaceType) || "standard",
      status: (formData.get("status") as ParkingSpaceStatus) || "active",
      is_assignable: formData.get("is_assignable") === "on",
      is_reservable: formData.get("is_reservable") === "on",
      notes: (formData.get("notes") as string)?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "space_created",
    entityType: "parking_space",
    entityId: data.id,
    metadata: { space_number },
  });

  revalidatePath("/app/spaces");
  return { success: true };
}

export async function updateSpace(id: string, formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx || !isManager(ctx.profile.role)) return { error: "Not authorized" };

  const supabase = createClient();
  const { error } = await supabase
    .from("parking_spaces")
    .update({
      space_number: (formData.get("space_number") as string)?.trim(),
      label: (formData.get("label") as string)?.trim() || null,
      level_or_zone: (formData.get("level_or_zone") as string)?.trim() || null,
      type: formData.get("type") as ParkingSpaceType,
      status: formData.get("status") as ParkingSpaceStatus,
      is_assignable: formData.get("is_assignable") === "on",
      is_reservable: formData.get("is_reservable") === "on",
      notes: (formData.get("notes") as string)?.trim() || null,
    })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "space_updated",
    entityType: "parking_space",
    entityId: id,
  });

  revalidatePath("/app/spaces");
  revalidatePath(`/app/spaces/${id}`);
  return { success: true };
}

export async function assignSpace(spaceId: string, residentId: string) {
  const ctx = await getSessionContext();
  if (!ctx || !isManager(ctx.profile.role)) return { error: "Not authorized" };

  const supabase = createClient();

  // Look up the space to copy its property + org onto the assignment.
  const { data: space } = await supabase
    .from("parking_spaces")
    .select("id, property_id, organization_id")
    .eq("id", spaceId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!space) return { error: "Space not found" };

  // End any existing active assignment first (one active per space).
  await supabase
    .from("parking_assignments")
    .update({ status: "ended", ends_at: new Date().toISOString() })
    .eq("parking_space_id", spaceId)
    .eq("status", "active");

  const { error } = await supabase.from("parking_assignments").insert({
    organization_id: space.organization_id,
    property_id: space.property_id,
    parking_space_id: spaceId,
    resident_id: residentId,
    status: "active",
  });

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "space_assigned",
    entityType: "parking_space",
    entityId: spaceId,
    metadata: { resident_id: residentId },
  });

  revalidatePath("/app/spaces");
  revalidatePath(`/app/spaces/${spaceId}`);
  revalidatePath("/app/residents");
  return { success: true };
}

export async function unassignSpace(spaceId: string) {
  const ctx = await getSessionContext();
  if (!ctx || !isManager(ctx.profile.role)) return { error: "Not authorized" };

  const supabase = createClient();
  const { error } = await supabase
    .from("parking_assignments")
    .update({ status: "ended", ends_at: new Date().toISOString() })
    .eq("parking_space_id", spaceId)
    .eq("organization_id", ctx.organization.id)
    .eq("status", "active");

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "space_unassigned",
    entityType: "parking_space",
    entityId: spaceId,
  });

  revalidatePath("/app/spaces");
  revalidatePath(`/app/spaces/${spaceId}`);
  revalidatePath("/app/residents");
  return { success: true };
}
