import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/types/database";

export interface SessionContext {
  profile: Profile;
  organization: Organization;
}

/**
 * Loads the current user's profile + organization for a server component.
 * Returns null when there is no authenticated user or no profile yet.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .maybeSingle();

  if (!organization) return null;

  return { profile, organization };
}

/**
 * Like getSessionContext but redirects unauthenticated users to sign-in
 * and users without a profile to onboarding. Use to guard app pages.
 */
export async function requireSessionContext(): Promise<SessionContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const ctx = await getSessionContext();
  if (!ctx) {
    redirect("/onboarding");
  }

  return ctx;
}
