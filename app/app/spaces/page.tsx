import { redirect } from "next/navigation";
import { ParkingSquare } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SpaceDialog } from "@/components/spaces/space-dialog";
import { SpacesTable, type SpaceRow } from "@/components/spaces/spaces-table";

export const metadata = { title: "Parking Spaces · AssetOS" };

export default async function SpacesPage() {
  const { profile, organization } = await requireSessionContext();
  if (!isManager(profile.role)) redirect("/app/dashboard");

  const supabase = createClient();
  const [
    { data: properties },
    { data: spaces },
    { data: assignments },
    { data: residents },
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name")
      .eq("organization_id", organization.id)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("parking_spaces")
      .select("*")
      .eq("organization_id", organization.id)
      .order("space_number"),
    supabase
      .from("parking_assignments")
      .select("parking_space_id, resident_id")
      .eq("organization_id", organization.id)
      .eq("status", "active"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, unit_number")
      .eq("organization_id", organization.id)
      .eq("role", "resident")
      .order("first_name"),
  ]);

  const propertyName = new Map(
    (properties ?? []).map((p) => [p.id, p.name] as const),
  );
  const residentName = new Map(
    (residents ?? []).map(
      (r) => [r.id, `${r.first_name} ${r.last_name}`.trim()] as const,
    ),
  );
  const assignmentBySpace = new Map(
    (assignments ?? []).map((a) => [a.parking_space_id, a.resident_id] as const),
  );

  const rows: SpaceRow[] = (spaces ?? []).map((s) => {
    const residentId = assignmentBySpace.get(s.id) ?? null;
    return {
      ...s,
      propertyName: propertyName.get(s.property_id) ?? "—",
      assignedResidentId: residentId,
      assignedResidentName: residentId
        ? (residentName.get(residentId) ?? "Resident")
        : null,
    };
  });

  const propertyOptions = properties ?? [];
  const residentOptions = residents ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Spaces"
        description="Every stall across your properties."
      >
        {propertyOptions.length > 0 && (
          <SpaceDialog properties={propertyOptions} />
        )}
      </PageHeader>

      {propertyOptions.length === 0 ? (
        <EmptyState
          icon={ParkingSquare}
          title="Add a property first"
          description="Parking spaces belong to a property. Create one to get started."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ParkingSquare}
          title="No parking spaces yet"
          description="Add your first parking space to start assigning and reserving."
          action={<SpaceDialog properties={propertyOptions} />}
        />
      ) : (
        <SpacesTable
          spaces={rows}
          properties={propertyOptions}
          residents={residentOptions}
        />
      )}
    </div>
  );
}
