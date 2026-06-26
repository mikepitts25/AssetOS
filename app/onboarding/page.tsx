import { redirect } from "next/navigation";
import { Building2, UserCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_ROLE_LABELS, type UserRole } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { claimInvite, createWorkspace } from "./actions";

export const metadata = { title: "Set up your workspace · AssetOS" };

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // If a profile already exists, skip onboarding.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (profile) redirect("/app/dashboard");

  // Was this email invited by a manager? Offer to join their workspace instead
  // of creating a new one. Admin client because the user has no org yet, so RLS
  // would hide a profile living in the manager's organization. The service-role
  // key is optional for the demo, so degrade to the create-workspace form when
  // it isn't configured (invite detection simply can't run without it).
  const invite = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? (
        await createAdminClient()
          .from("profiles")
          .select("id, role, organization_id")
          .is("auth_user_id", null)
          .eq("email", (user.email ?? "").trim().toLowerCase())
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      ).data
    : null;

  if (invite) {
    const admin = createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", invite.organization_id)
      .maybeSingle();
    const orgName = org?.name ?? "your organization";
    const roleLabel = USER_ROLE_LABELS[invite.role as UserRole] ?? "member";

    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl">You&apos;ve been invited</CardTitle>
            <CardDescription>
              A manager added <span className="font-medium">{user.email}</span>{" "}
              to <span className="font-medium">{orgName}</span> as{" "}
              <span className="font-medium">{roleLabel}</span>. Join to start
              using your workspace.
            </CardDescription>
          </CardHeader>
          <form action={claimInvite}>
            <CardFooter className="flex-col gap-3">
              <Button type="submit" className="w-full">
                Join {orgName}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Not you? Contact your property manager to update the invite
                email.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">Set up your workspace</CardTitle>
          <CardDescription>
            Create your organization to start managing parking. You&apos;ll be
            the workspace admin.
          </CardDescription>
        </CardHeader>
        <form action={createWorkspace}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization name</Label>
              <Input
                id="organizationName"
                name="organizationName"
                placeholder="Stuttgart Apartment Group"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={
                    (user.user_metadata?.first_name as string) ?? ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={(user.user_metadata?.last_name as string) ?? ""}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Create workspace
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
