import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager, isOrgAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ResidentDialog } from "@/components/residents/resident-dialog";
import { ResidentActions } from "@/components/residents/resident-actions";
import { UserStatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { initials } from "@/lib/utils";
import { USER_ROLE_LABELS } from "@/types/domain";

export const metadata = { title: "Residents · AssetOS" };

export default async function ResidentsPage() {
  const { profile, organization } = await requireSessionContext();
  if (!isManager(profile.role)) redirect("/app/dashboard");

  const supabase = createClient();
  const [{ data: residents }, { data: assignments }, { data: spaces }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", organization.id)
        .order("first_name"),
      supabase
        .from("parking_assignments")
        .select("resident_id, parking_space_id")
        .eq("organization_id", organization.id)
        .eq("status", "active"),
      supabase
        .from("parking_spaces")
        .select("id, space_number")
        .eq("organization_id", organization.id),
    ]);

  const spaceLabel = new Map(
    (spaces ?? []).map((s) => [s.id, s.space_number] as const),
  );
  const assignedSpaceByResident = new Map<string, string>();
  for (const a of assignments ?? []) {
    const label = spaceLabel.get(a.parking_space_id);
    if (label) assignedSpaceByResident.set(a.resident_id, label);
  }

  const canChangeRole = isOrgAdmin(profile.role);
  const rows = residents ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Residents"
        description="People in your organization and their parking."
      >
        <ResidentDialog canChangeRole={canChangeRole} />
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No residents yet"
          description="Add residents to assign spaces and let them reserve parking."
          action={<ResidentDialog canChangeRole={canChangeRole} />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Assigned space</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[11px]">
                            {initials(r.first_name, r.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {r.first_name} {r.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {USER_ROLE_LABELS[r.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.unit_number ?? "—"}
                    </TableCell>
                    <TableCell>
                      {assignedSpaceByResident.get(r.id) ? (
                        <Badge variant="success">
                          {assignedSpaceByResident.get(r.id)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ResidentActions
                        resident={r}
                        canChangeRole={canChangeRole && r.id !== profile.id}
                      />
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
