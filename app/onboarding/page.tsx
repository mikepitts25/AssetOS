import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
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
import { createWorkspace } from "./actions";

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
