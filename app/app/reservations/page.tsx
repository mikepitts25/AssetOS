import { redirect } from "next/navigation";
import { CalendarRange } from "lucide-react";

import { requireSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ReservationsTable,
  type ReservationRow,
} from "@/components/reservations/reservations-table";

export const metadata = { title: "Reservations · AssetOS" };

export default async function ReservationsPage() {
  const { profile, organization } = await requireSessionContext();
  if (!isManager(profile.role)) redirect("/app/dashboard");

  const supabase = createClient();
  const [
    { data: reservations },
    { data: spaces },
    { data: properties },
    { data: profiles },
    { data: availabilities },
  ] = await Promise.all([
    supabase
      .from("reservations")
      .select("*")
      .eq("organization_id", organization.id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("parking_spaces")
      .select("id, space_number")
      .eq("organization_id", organization.id),
    supabase
      .from("properties")
      .select("id, name")
      .eq("organization_id", organization.id),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("organization_id", organization.id),
    supabase
      .from("space_availabilities")
      .select("id, released_by_resident_id")
      .eq("organization_id", organization.id),
  ]);

  const spaceLabel = new Map(
    (spaces ?? []).map((s) => [s.id, `Space ${s.space_number}`] as const),
  );
  const propertyName = new Map(
    (properties ?? []).map((p) => [p.id, p.name] as const),
  );
  const personName = new Map(
    (profiles ?? []).map(
      (p) => [p.id, `${p.first_name} ${p.last_name}`.trim()] as const,
    ),
  );
  const releaserByAvailability = new Map(
    (availabilities ?? []).map(
      (a) => [a.id, a.released_by_resident_id] as const,
    ),
  );

  const rows: ReservationRow[] = (reservations ?? []).map((r) => {
    const releaserId = r.availability_id
      ? releaserByAvailability.get(r.availability_id)
      : null;
    return {
      ...r,
      spaceLabel: spaceLabel.get(r.parking_space_id) ?? "Space",
      propertyName: propertyName.get(r.property_id) ?? "—",
      reservedByName: personName.get(r.reserved_by_resident_id) ?? "—",
      releasedByName: releaserId ? (personName.get(releaserId) ?? null) : null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description="Every booking across your organization."
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No reservations yet"
          description="Reservations will appear here as residents book released spaces."
        />
      ) : (
        <ReservationsTable
          reservations={rows}
          properties={properties ?? []}
        />
      )}
    </div>
  );
}
