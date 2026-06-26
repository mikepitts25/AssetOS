import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Organizations · AssetOS" };

export default async function AdminOrganizationsPage() {
  const { profile } = await requireSessionContext();
  if (!isPlatformAdmin(profile.role)) redirect("/app/dashboard");

  const supabase = createClient();
  const [{ data: organizations }, { data: profiles }, { data: properties }] =
    await Promise.all([
      supabase.from("organizations").select("*").order("created_at"),
      supabase.from("profiles").select("organization_id"),
      supabase.from("properties").select("organization_id"),
    ]);

  const memberCount = new Map<string, number>();
  for (const p of profiles ?? []) {
    memberCount.set(
      p.organization_id,
      (memberCount.get(p.organization_id) ?? 0) + 1,
    );
  }
  const propertyCount = new Map<string, number>();
  for (const p of properties ?? []) {
    propertyCount.set(
      p.organization_id,
      (propertyCount.get(p.organization_id) ?? 0) + 1,
    );
  }

  const rows = organizations ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="All tenants on the AssetOS platform."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations"
          description="No tenant workspaces exist yet."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      {o.name}
                      {o.is_demo && (
                        <Badge variant="warning" className="ml-2">
                          Demo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {o.slug}
                    </TableCell>
                    <TableCell>{memberCount.get(o.id) ?? 0}</TableCell>
                    <TableCell>{propertyCount.get(o.id) ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(o.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.type ?? "—"}
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
