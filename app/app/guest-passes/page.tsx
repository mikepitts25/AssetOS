import { Ticket } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { GuestPassDialog } from "@/components/guest-passes/guest-pass-dialog";
import { CancelPassButton } from "@/components/guest-passes/cancel-pass-button";
import { QrToken } from "@/components/guest-passes/qr-token";
import { VisitorPassStatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Guest Passes · AssetOS" };

export default async function GuestPassesPage() {
  const { profile, organization } = await requireSessionContext();
  const manager = isManager(profile.role);
  const supabase = createClient();

  // Managers see every pass in the org; residents see only their own.
  let query = supabase
    .from("visitor_passes")
    .select("*")
    .eq("organization_id", organization.id)
    .order("starts_at", { ascending: false });
  if (!manager) query = query.eq("resident_id", profile.id);

  const [{ data: passes }, { data: properties }, { data: profiles }] =
    await Promise.all([
      query,
      supabase
        .from("properties")
        .select("id, name")
        .eq("organization_id", organization.id)
        .eq("is_archived", false),
      supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("organization_id", organization.id),
    ]);

  const propertyName = new Map(
    (properties ?? []).map((p) => [p.id, p.name] as const),
  );
  const residentName = new Map(
    (profiles ?? []).map(
      (p) => [p.id, `${p.first_name} ${p.last_name}`.trim()] as const,
    ),
  );

  const rows = passes ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guest Passes"
        description={
          manager
            ? "Every visitor pass across your organization."
            : "Create and manage parking passes for your guests."
        }
      >
        <GuestPassDialog properties={properties ?? []} />
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No guest passes yet"
          description="Issue a visitor pass and we'll generate a scannable token automatically."
          action={<GuestPassDialog properties={properties ?? []} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((pass) => (
            <Card key={pass.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{pass.guest_name}</CardTitle>
                  <CardDescription>
                    {propertyName.get(pass.property_id) ?? "—"}
                  </CardDescription>
                </div>
                <VisitorPassStatusBadge status={pass.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <QrToken token={pass.qr_code_token} />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      {pass.vehicle_plate ?? "No plate"}
                    </p>
                    <p className="text-muted-foreground">
                      {[pass.vehicle_make, pass.vehicle_model]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </p>
                    <p className="pt-1 font-mono text-[11px] text-muted-foreground">
                      {pass.qr_code_token.slice(0, 12)}…
                    </p>
                  </div>
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p>{formatDateTime(pass.starts_at)}</p>
                  <p>→ {formatDateTime(pass.ends_at)}</p>
                  {manager && (
                    <p className="pt-1">
                      Host: {residentName.get(pass.resident_id) ?? "—"}
                    </p>
                  )}
                </div>
                {pass.status === "active" && <CancelPassButton id={pass.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
