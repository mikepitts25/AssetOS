import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PropertyDialog } from "@/components/properties/property-dialog";
import { ArchiveButton } from "@/components/properties/archive-button";
import { SpaceStatusBadge } from "@/components/shared/status-badge";
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

export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile, organization } = await requireSessionContext();
  if (!isManager(profile.role)) redirect("/app/dashboard");

  const supabase = createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!property) notFound();

  const { data: spaces } = await supabase
    .from("parking_spaces")
    .select("*")
    .eq("property_id", property.id)
    .order("space_number");

  const spaceRows = spaces ?? [];
  const location = [
    property.address_line_1,
    property.city,
    property.state_region,
    property.postal_code,
    property.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/app/properties">
          <ArrowLeft className="h-4 w-4" /> Properties
        </Link>
      </Button>

      <PageHeader title={property.name} description={property.description ?? undefined}>
        <PropertyDialog property={property} />
        {!property.is_archived && <ArchiveButton propertyId={property.id} />}
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{location || "No address on file"}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timezone</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {property.timezone}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total spaces</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {spaceRows.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parking spaces</CardTitle>
          <CardDescription>
            Spaces belonging to this property.{" "}
            <Link href="/app/spaces" className="text-primary hover:underline">
              Manage spaces
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {spaceRows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No spaces yet"
                description="Add parking spaces from the Parking Spaces page."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Space</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spaceRows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/app/spaces/${s.id}`}
                        className="hover:underline"
                      >
                        {s.space_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.level_or_zone ?? "—"}
                    </TableCell>
                    <TableCell>{SPACE_TYPE_LABELS[s.type]}</TableCell>
                    <TableCell>
                      <SpaceStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {s.is_assignable && (
                          <Badge variant="secondary">Assignable</Badge>
                        )}
                        {s.is_reservable && (
                          <Badge variant="secondary">Reservable</Badge>
                        )}
                      </div>
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
