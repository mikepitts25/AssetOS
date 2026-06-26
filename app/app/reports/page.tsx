import { redirect } from "next/navigation";
import {
  Building2,
  Clock,
  Gauge,
  ParkingSquare,
  Ticket,
  TriangleAlert,
  Users,
} from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { getReportMetrics } from "@/lib/metrics";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Reports · AssetOS" };

function RankedList({
  rows,
  emptyLabel,
}: {
  rows: { label: string; value: number }[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{r.label}</span>
            <span className="text-muted-foreground">{r.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ReportsPage() {
  const { profile, organization } = await requireSessionContext();
  if (!isManager(profile.role)) redirect("/app/dashboard");

  const m = await getReportMetrics(organization.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports"
        description="Utilization and activity across your organization."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Utilization"
          value={`${m.utilizationPct}%`}
          icon={Gauge}
          accent="warning"
        />
        <MetricCard
          label="Released hours"
          value={m.totalReleasedHours}
          icon={Clock}
        />
        <MetricCard
          label="Reserved hours"
          value={m.totalReservedHours}
          icon={Clock}
          accent="success"
        />
        <MetricCard label="Guest passes" value={m.guestPassCount} icon={Ticket} />
        <MetricCard
          label="Conflicts"
          value={m.conflictCount}
          icon={TriangleAlert}
        />
        <MetricCard
          label="Active residents"
          value={m.mostActiveResidents.length}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Most used properties
            </CardTitle>
            <CardDescription>By total reservations</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedList
              rows={m.mostUsedProperties.map((p) => ({
                label: p.name,
                value: p.reservations,
              }))}
              emptyLabel="No reservations yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ParkingSquare className="h-4 w-4" /> Most released spaces
            </CardTitle>
            <CardDescription>By number of releases</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedList
              rows={m.mostReleasedSpaces.map((s) => ({
                label: s.space,
                value: s.releases,
              }))}
              emptyLabel="No releases yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Most active residents
            </CardTitle>
            <CardDescription>By reservations made</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedList
              rows={m.mostActiveResidents.map((r) => ({
                label: r.name,
                value: r.reservations,
              }))}
              emptyLabel="No resident activity yet."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
