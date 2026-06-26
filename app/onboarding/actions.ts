"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Find an unclaimed (`invited`) profile a manager created for this email.
 * Uses the admin client because the signing-up user has no org yet, so RLS
 * would hide a profile that lives in the manager's organization. Emails are
 * stored lowercased by `addResident`, so match on the lowercased address.
 */
async function findInvitedProfile(
  admin: SupabaseClient,
  email: string | undefined,
) {
  if (!email) return null;
  const { data } = await admin
    .from("profiles")
    .select("id, organization_id")
    .is("auth_user_id", null)
    .eq("email", email.trim().toLowerCase())
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

/** Attach the signed-in auth user to an invited profile and activate it. */
async function attachAuthUser(
  admin: SupabaseClient,
  profileId: string,
  organizationId: string,
  authUserId: string,
  email: string,
) {
  const { error } = await admin
    .from("profiles")
    .update({ auth_user_id: authUserId, status: "active" })
    .eq("id", profileId)
    .is("auth_user_id", null); // re-check: never steal an already-claimed profile

  if (error) throw new Error(error.message);

  await recordAudit({
    organizationId,
    actorProfileId: profileId,
    action: "user_role_changed",
    entityType: "profile",
    entityId: profileId,
    metadata: { claimed: true, email },
  });
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

/**
 * Bootstraps a workspace for a newly signed-up user. Uses the service-role
 * client to create the organization + profile, which is the one place we
 * intentionally bypass RLS (the user has no org/profile yet, so the normal
 * policies can't apply). The new user becomes the org_admin.
 */
export async function createWorkspace(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const admin = createAdminClient();

  // Already onboarded? Go straight to the dashboard.
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existing) redirect("/app/dashboard");

  // Invited by a manager? Claim that profile instead of spinning up a new org.
  // Defensive: the onboarding page routes invited users to a Join button, but
  // guard the create path too so a direct POST can't orphan the invite.
  const invited = await findInvitedProfile(admin, user.email);
  if (invited) {
    await attachAuthUser(
      admin,
      invited.id,
      invited.organization_id,
      user.id,
      user.email ?? "",
    );
    redirect("/app/dashboard");
  }

  const orgName =
    (formData.get("organizationName") as string)?.trim() || "My Community";
  const firstName =
    (formData.get("firstName") as string)?.trim() ||
    (user.user_metadata?.first_name as string) ||
    "";
  const lastName =
    (formData.get("lastName") as string)?.trim() ||
    (user.user_metadata?.last_name as string) ||
    "";

  // Unique-ish slug.
  const slug = `${slugify(orgName)}-${user.id.slice(0, 6)}`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, slug, type: "community", is_demo: false })
    .select("id")
    .single();

  if (orgError || !org) {
    throw new Error(orgError?.message ?? "Failed to create organization");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    auth_user_id: user.id,
    organization_id: org.id,
    first_name: firstName,
    last_name: lastName,
    email: user.email ?? "",
    role: "org_admin",
    status: "active",
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  redirect("/app/dashboard");
}

/**
 * Claim a manager-created invite: attach the signed-in auth user to the
 * existing `invited` profile (keeping its org + assigned role) instead of
 * creating a brand-new workspace. Triggered by the "Join" button the
 * onboarding page shows when it detects a matching invite.
 */
export async function claimInvite() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const admin = createAdminClient();

  // Already onboarded? Nothing to claim.
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existing) redirect("/app/dashboard");

  const invited = await findInvitedProfile(admin, user.email);
  if (!invited) redirect("/onboarding"); // invite vanished — fall back to setup

  await attachAuthUser(
    admin,
    invited.id,
    invited.organization_id,
    user.id,
    user.email ?? "",
  );

  redirect("/app/dashboard");
}
