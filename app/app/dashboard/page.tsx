import {
  Building2,
  CalendarRange,
  CheckCircle2,
  Gauge,
  ParkingSquare,
  UserCheck,
} from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/metrics";
import { isManager } from "@/lib/roles";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  OccupancyChart,
  ReservationsByPropertyChart,
  UtilizationChart,
} from "@/components/dashboard/charts";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Dashboard · AssetOS" };

export default async function DashboardPage() {
  const { profile, organization } = await requireSessionContext();
  const metrics = await getDashboardMetrics(organization.id);
  const manager = isManager(profile.role);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${profile.first_name || "there"}`}
        description={`Here's what's happening across ${organization.name}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Properties"
          value={metrics.totalProperties}
          icon={Building2}
        />
        <MetricCard
          label="Parking spaces"
          value={metrics.totalSpaces}
          icon={ParkingSquare}
        />
        <MetricCard
          label="Assigned"
          value={metrics.assignedSpaces}
          icon={UserCheck}
        />
        <MetricCard
          label="Available now"
          value={metrics.availableNow}
          icon={CheckCircle2}
          accent="success"
        />
        <MetricCard
          label="Active reservations"
          value={metrics.activeReservations}
          icon={CalendarRange}
        />
        <MetricCard
          label="Utilization"
          value={`${metrics.utilizationPct}%`}
          icon={Gauge}
          accent="warning"
        />
      </div>

      {manager ? (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Utilization over time</CardTitle>
                <CardDescription>
                  Share of spaces in active use over the last 14 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UtilizationChart data={metrics.utilizationSeries} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Available vs occupied</CardTitle>
                <CardDescription>Current snapshot.</CardDescription>
              </CardHeader>
              <CardContent>
                <OccupancyChart
                  occupied={metrics.occupancy.occupied}
                  available={metrics.occupancy.available}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reservations by property</CardTitle>
              <CardDescription>
                Total reservations recorded per property.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReservationsByPropertyChart
                data={metrics.reservationsByProperty}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your parking at a glance</CardTitle>
            <CardDescription>
              Manage your assigned space, release it when you&apos;re away, and
              reserve open spaces from the sidebar.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Head to <span className="font-medium text-foreground">My Space</span>{" "}
            to release your space, or{" "}
            <span className="font-medium text-foreground">My Reservations</span>{" "}
            to browse and book available spaces.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
