import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, MapPin } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PropertyDialog } from "@/components/properties/property-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Properties · AssetOS" };

export default async function PropertiesPage() {
  const { profile, organization } = await requireSessionContext();
  if (!isManager(profile.role)) redirect("/app/dashboard");

  const supabase = createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true });

  // Space counts per property.
  const { data: spaces } = await supabase
    .from("parking_spaces")
    .select("property_id")
    .eq("organization_id", organization.id);
  const spaceCounts = new Map<string, number>();
  for (const s of spaces ?? []) {
    spaceCounts.set(s.property_id, (spaceCounts.get(s.property_id) ?? 0) + 1);
  }

  const rows = properties ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Buildings and communities in your organization."
      >
        <PropertyDialog />
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first building or community to start managing parking."
          action={<PropertyDialog />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Spaces</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/app/properties/${p.id}`}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {[p.city, p.state_region, p.country]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </span>
                    </TableCell>
                    <TableCell>{spaceCounts.get(p.id) ?? 0}</TableCell>
                    <TableCell>
                      {p.is_archived ? (
                        <Badge variant="muted">Archived</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <PropertyDialog property={p} />
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/app/properties/${p.id}`}>View</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
