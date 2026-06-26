import { CalendarRange, MapPin } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ReserveDialog } from "@/components/parking/reserve-dialog";
import { CancelReservationButton } from "@/components/parking/cancel-reservation-button";
import { ReservationStatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SPACE_TYPE_LABELS } from "@/types/domain";

export const metadata = { title: "My Reservations · AssetOS" };

export default async function MyReservationsPage() {
  const { profile, organization } = await requireSessionContext();
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  const [
    { data: availabilities },
    { data: myReservations },
    { data: spaces },
    { data: properties },
  ] = await Promise.all([
    supabase
      .from("space_availabilities")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("status", "available")
      .gte("ends_at", nowIso)
      .order("starts_at"),
    supabase
      .from("reservations")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("reserved_by_resident_id", profile.id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("parking_spaces")
      .select("id, space_number, level_or_zone, type, property_id")
      .eq("organization_id", organization.id),
    supabase
      .from("properties")
      .select("id, name")
      .eq("organization_id", organization.id),
  ]);

  const spaceById = new Map((spaces ?? []).map((s) => [s.id, s] as const));
  const propertyName = new Map(
    (properties ?? []).map((p) => [p.id, p.name] as const),
  );

  // Don't show the resident their own released space in the browse list.
  const available = (availabilities ?? []).filter(
    (a) => a.released_by_resident_id !== profile.id,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reserve a Space"
        description="Browse spaces neighbors have released and book one."
      />

      <Card>
        <CardHeader>
          <CardTitle>Available now & upcoming</CardTitle>
          <CardDescription>
            Released spaces you can reserve in {organization.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {available.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarRange}
                title="No spaces available right now"
                description="When a neighbor releases their space, it'll show up here for you to reserve."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Space</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Available window</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {available.map((a) => {
                  const space = spaceById.get(a.parking_space_id);
                  const label = space
                    ? `Space ${space.space_number}`
                    : "Space";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {label}
                        {space?.level_or_zone && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {space.level_or_zone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {propertyName.get(a.property_id) ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {space ? (
                          <Badge variant="secondary">
                            {SPACE_TYPE_LABELS[space.type]}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(a.starts_at)} →{" "}
                        {formatDateTime(a.ends_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ReserveDialog
                          availabilityId={a.id}
                          spaceLabel={label}
                          windowStart={a.starts_at}
                          windowEnd={a.ends_at}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My reservations</CardTitle>
          <CardDescription>Your current and past bookings.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {(myReservations ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              You haven&apos;t made any reservations yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Space</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(myReservations ?? []).map((r) => {
                  const space = spaceById.get(r.parking_space_id);
                  const cancellable =
                    r.status === "confirmed" || r.status === "pending";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {space ? `Space ${space.space_number}` : "Space"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(r.starts_at)} →{" "}
                        {formatDateTime(r.ends_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.vehicle_plate ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ReservationStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {cancellable && <CancelReservationButton id={r.id} />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
