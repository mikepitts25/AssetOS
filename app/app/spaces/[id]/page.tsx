import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { SpaceDialog } from "@/components/spaces/space-dialog";
import { AssignDialog } from "@/components/spaces/assign-dialog";
import {
  AvailabilityStatusBadge,
  ReservationStatusBadge,
  SpaceStatusBadge,
} from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function SpaceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile, organization } = await requireSessionContext();
  if (!isManager(profile.role)) redirect("/app/dashboard");

  const supabase = createClient();
  const { data: space } = await supabase
    .from("parking_spaces")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!space) notFound();

  const [
    { data: property },
    { data: properties },
    { data: residents },
    { data: assignment },
    { data: availabilities },
    { data: reservations },
  ] = await Promise.all([
    supabase.from("properties").select("name").eq("id", space.property_id).maybeSingle(),
    supabase.from("properties").select("id, name").eq("organization_id", organization.id),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, unit_number")
      .eq("organization_id", organization.id)
      .eq("role", "resident"),
    supabase
      .from("parking_assignments")
      .select("resident_id")
      .eq("parking_space_id", space.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("space_availabilities")
      .select("*")
      .eq("parking_space_id", space.id)
      .order("starts_at", { ascending: false })
      .limit(10),
    supabase
      .from("reservations")
      .select("*")
      .eq("parking_space_id", space.id)
      .order("starts_at", { ascending: false })
      .limit(10),
  ]);

  const residentList = residents ?? [];
  const residentName = new Map(
    residentList.map(
      (r) => [r.id, `${r.first_name} ${r.last_name}`.trim()] as const,
    ),
  );
  const assignedResidentId = assignment?.resident_id ?? null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/app/spaces">
          <ArrowLeft className="h-4 w-4" /> Parking Spaces
        </Link>
      </Button>

      <PageHeader
        title={`Space ${space.space_number}`}
        description={`${property?.name ?? ""}${
          space.level_or_zone ? ` · ${space.level_or_zone}` : ""
        }`}
      >
        <SpaceDialog properties={properties ?? []} space={space} />
        <AssignDialog
          spaceId={space.id}
          residents={residentList}
          currentResidentId={assignedResidentId}
          triggerLabel={assignedResidentId ? "Reassign" : "Assign"}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Type</CardTitle>
          </CardHeader>
          <CardContent className="font-medium">
            {SPACE_TYPE_LABELS[space.type]}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpaceStatusBadge status={space.status} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Assigned to
            </CardTitle>
          </CardHeader>
          <CardContent className="font-medium">
            {assignedResidentId
              ? (residentName.get(assignedResidentId) ?? "Resident")
              : "Unassigned"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Flags</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-1.5">
            {space.is_assignable && <Badge variant="secondary">Assignable</Badge>}
            {space.is_reservable && <Badge variant="secondary">Reservable</Badge>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservation history</CardTitle>
          <CardDescription>Recent reservations for this space.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {(reservations ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No reservations yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Window</TableHead>
                  <TableHead>Reserved by</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reservations ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(r.starts_at)} → {formatDateTime(r.ends_at)}
                    </TableCell>
                    <TableCell>
                      {residentName.get(r.reserved_by_resident_id) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.vehicle_plate ?? "—"}
                    </TableCell>
                    <TableCell>
                      <ReservationStatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability history</CardTitle>
          <CardDescription>Recent releases of this space.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {(availabilities ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No releases yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Window</TableHead>
                  <TableHead>Released by</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(availabilities ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(a.starts_at)} → {formatDateTime(a.ends_at)}
                    </TableCell>
                    <TableCell>
                      {residentName.get(a.released_by_resident_id) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <AvailabilityStatusBadge status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
