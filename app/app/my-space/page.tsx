import { Car } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ReleaseDialog } from "@/components/parking/release-dialog";
import { CancelReleaseButton } from "@/components/parking/cancel-release-button";
import { AvailabilityStatusBadge } from "@/components/shared/status-badge";
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

export const metadata = { title: "My Space · AssetOS" };

export default async function MySpacePage() {
  const { profile } = await requireSessionContext();
  const supabase = createClient();

  // The resident's active assignment + its space.
  const { data: assignment } = await supabase
    .from("parking_assignments")
    .select("parking_space_id")
    .eq("resident_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  const space = assignment
    ? (
        await supabase
          .from("parking_spaces")
          .select("*")
          .eq("id", assignment.parking_space_id)
          .maybeSingle()
      ).data
    : null;

  const property = space
    ? (
        await supabase
          .from("properties")
          .select("name")
          .eq("id", space.property_id)
          .maybeSingle()
      ).data
    : null;

  const { data: releases } = space
    ? await supabase
        .from("space_availabilities")
        .select("*")
        .eq("parking_space_id", space.id)
        .eq("released_by_resident_id", profile.id)
        .order("starts_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Parking Space"
        description="View your assigned space and release it when you're away."
      />

      {!space ? (
        <EmptyState
          icon={Car}
          title="No space assigned yet"
          description="Your property manager hasn't assigned you a parking space. Once they do, you'll be able to release it here."
        />
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-2xl">
                  Space {space.space_number}
                </CardTitle>
                <CardDescription>
                  {property?.name}
                  {space.level_or_zone ? ` · ${space.level_or_zone}` : ""} ·{" "}
                  {SPACE_TYPE_LABELS[space.type]}
                </CardDescription>
              </div>
              <ReleaseDialog
                spaceId={space.id}
                spaceLabel={`Space ${space.space_number}`}
              />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This is your primary assigned space. When you release it, approved
              residents in your organization can reserve it for the window you
              choose — and you can cancel any release that hasn&apos;t been
              booked.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My releases</CardTitle>
              <CardDescription>
                Current and past availability windows for your space.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(releases ?? []).length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  You haven&apos;t released your space yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Window</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(releases ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">
                          {formatDateTime(r.starts_at)} →{" "}
                          {formatDateTime(r.ends_at)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.notes ?? "—"}
                        </TableCell>
                        <TableCell>
                          <AvailabilityStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "available" && (
                            <CancelReleaseButton id={r.id} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
