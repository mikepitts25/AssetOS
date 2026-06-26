import { CreditCard, Building2, Bell, ShieldCheck } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { USER_ROLE_LABELS } from "@/types/domain";

export const metadata = { title: "Settings · AssetOS" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const { profile, organization } = await requireSessionContext();
  const manager = isManager(profile.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your profile, organization, and platform configuration."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Your profile
            </CardTitle>
            <CardDescription>How you appear in this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <Row
              label="Name"
              value={`${profile.first_name} ${profile.last_name}`.trim() || "—"}
            />
            <Row label="Email" value={profile.email} />
            <Row label="Role" value={USER_ROLE_LABELS[profile.role]} />
            <Row label="Unit" value={profile.unit_number ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Organization
            </CardTitle>
            <CardDescription>Your shared workspace.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <Row label="Name" value={organization.name} />
            <Row label="Workspace ID" value={organization.slug} />
            <Row label="Type" value={organization.type ?? "—"} />
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant="secondary">Starter (demo)</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {manager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Billing
            </CardTitle>
            <CardDescription>
              Subscription and payment management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-lg border border-dashed bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-sm">
                <p className="font-medium">Billing is not enabled yet</p>
                <p className="text-muted-foreground">
                  Stripe integration is architected but not active in this MVP.
                  Plans: Starter $79/mo · Growth $149–$399/mo · Enterprise
                  custom.
                </p>
              </div>
              <Badge variant="warning">Coming soon</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Notifications
          </CardTitle>
          <CardDescription>
            Email, SMS, and push notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Notification channels are planned for a future release. Reservation
          confirmations and guest pass alerts will be configurable here.
        </CardContent>
      </Card>

      <Separator />
      <p className="text-center text-xs text-muted-foreground">
        AssetOS · ParkingOS module · MVP build
      </p>
    </div>
  );
}
