"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
