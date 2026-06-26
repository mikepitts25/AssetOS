"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

/**
 * Lets a signed-in user edit their own profile basics. Only personal fields are
 * writable here — never role, email, status, or organization — so this can't be
 * used to self-escalate even though the RLS "user updates own profile" policy is
 * scoped by auth_user_id alone. The update is additionally constrained to the
 * caller's own profile id.
 */
export async function updateOwnProfile(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Not authorized" };

  const first_name = (formData.get("first_name") as string)?.trim();
  const last_name = (formData.get("last_name") as string)?.trim() ?? "";
  const phone = (formData.get("phone") as string)?.trim() || null;
  const unit_number = (formData.get("unit_number") as string)?.trim() || null;

  if (!first_name) return { error: "First name is required" };

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ first_name, last_name, phone, unit_number })
    .eq("id", ctx.profile.id);

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "user_role_changed",
    entityType: "profile",
    entityId: ctx.profile.id,
    metadata: { self_update: true },
  });

  revalidatePath("/app/settings");
  return { success: true };
}
