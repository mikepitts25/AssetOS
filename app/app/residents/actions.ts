"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { isManager, isOrgAdmin } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";
import type { UserRole, UserStatus } from "@/types/domain";

export async function addResident(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx || !isManager(ctx.profile.role)) return { error: "Not authorized" };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const first_name = (formData.get("first_name") as string)?.trim();
  const last_name = (formData.get("last_name") as string)?.trim();
  if (!email || !first_name) {
    return { error: "First name and email are required" };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      organization_id: ctx.organization.id,
      auth_user_id: null,
      first_name,
      last_name: last_name ?? "",
      email,
      phone: (formData.get("phone") as string)?.trim() || null,
      unit_number: (formData.get("unit_number") as string)?.trim() || null,
      role: (formData.get("role") as UserRole) || "resident",
      // No auth account yet — they're invited until they sign up.
      status: "invited",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "user_role_changed",
    entityType: "profile",
    entityId: data.id,
    metadata: { created: true, email },
  });

  revalidatePath("/app/residents");
  return { success: true };
}

export async function setResidentStatus(id: string, status: UserStatus) {
  const ctx = await getSessionContext();
  if (!ctx || !isManager(ctx.profile.role)) return { error: "Not authorized" };

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: error.message };

  revalidatePath("/app/residents");
  return { success: true };
}

export async function changeResidentRole(id: string, role: UserRole) {
  const ctx = await getSessionContext();
  if (!ctx || !isOrgAdmin(ctx.profile.role)) {
    return { error: "Only org admins can change roles" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "user_role_changed",
    entityType: "profile",
    entityId: id,
    metadata: { role },
  });

  revalidatePath("/app/residents");
  return { success: true };
}
