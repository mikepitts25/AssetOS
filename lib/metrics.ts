import { subDays, startOfDay, format } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { hoursBetween } from "@/lib/dates";
import type {
  ParkingSpace,
  Property,
  Reservation,
  SpaceAvailability,
  VisitorPass,
} from "@/types/database";

export interface DashboardMetrics {
  totalProperties: number;
  totalSpaces: number;
  assignedSpaces: number;
  availableNow: number;
  activeReservations: number;
  utilizationPct: number;
  utilizationSeries: { label: string; utilization: number }[];
  reservationsByProperty: { property: string; reservations: number }[];
  occupancy: { occupied: number; available: number };
}

/**
 * Computes the headline dashboard metrics for an organization. RLS already
 * scopes every query to the caller's org, but we filter explicitly too for
 * defense in depth and clarity.
 */
export async function getDashboardMetrics(
  organizationId: string,
): Promise<DashboardMetrics> {
  const supabase = createClient();

  const [
    { data: properties },
    { data: spaces },
    { data: assignments },
    { data: availabilities },
    { data: reservations },
  ] = await Promise.all([
    supabase.from("properties").select("id, name").eq("organization_id", organizationId).eq("is_archived", false),
    supabase.from("parking_spaces").select("id, property_id, status").eq("organization_id", organizationId),
    supabase.from("parking_assignments").select("id, parking_space_id").eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("space_availabilities").select("id, starts_at, ends_at, status").eq("organization_id", organizationId),
    supabase.from("reservations").select("id, property_id, status, starts_at, ends_at, created_at").eq("organization_id", organizationId),
  ]);

  const props = (properties ?? []) as Pick<Property, "id" | "name">[];
  const spaceRows = (spaces ?? []) as Pick<ParkingSpace, "id" | "property_id" | "status">[];
  const assignmentRows = assignments ?? [];
  const availRows = (availabilities ?? []) as Pick<
    SpaceAvailability,
    "id" | "starts_at" | "ends_at" | "status"
  >[];
  const reservationRows = (reservations ?? []) as Pick<
    Reservation,
    "id" | "property_id" | "status" | "starts_at" | "ends_at" | "created_at"
  >[];

  const now = new Date();

  const totalSpaces = spaceRows.length;
  const assignedSpaces = new Set(
    assignmentRows.map((a) => a.parking_space_id),
  ).size;

  const availableNow = availRows.filter(
    (a) =>
      a.status === "available" &&
      new Date(a.starts_at) <= now &&
      new Date(a.ends_at) >= now,
  ).length;

  const activeReservations = reservationRows.filter(
    (r) =>
      (r.status === "confirmed" || r.status === "pending") &&
      new Date(r.ends_at) >= now,
  ).length;

  // Occupied = active spaces that are assigned or currently reserved.
  const reservedSpaceCount = reservationRows.filter(
    (r) =>
      r.status === "confirmed" &&
      new Date(r.starts_at) <= now &&
      new Date(r.ends_at) >= now,
  ).length;
  const occupied = Math.min(totalSpaces, assignedSpaces + reservedSpaceCount);
  const available = Math.max(0, totalSpaces - occupied);
  const utilizationPct = totalSpaces
    ? Math.round((occupied / totalSpaces) * 100)
    : 0;

  // Utilization over the last 14 days: share of confirmed/completed
  // reservations active on each day relative to total spaces.
  const utilizationSeries = Array.from({ length: 14 }).map((_, i) => {
    const day = startOfDay(subDays(now, 13 - i));
    const dayEnd = subDays(now, 13 - i);
    const activeThatDay = reservationRows.filter(
      (r) =>
        (r.status === "confirmed" || r.status === "completed") &&
        new Date(r.starts_at) <= dayEnd &&
        new Date(r.ends_at) >= day,
    ).length;
    const pct = totalSpaces
      ? Math.min(100, Math.round((activeThatDay / totalSpaces) * 100))
      : 0;
    return { label: format(day, "MMM d"), utilization: pct };
  });

  const reservationsByProperty = props.map((p) => ({
    property: p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name,
    reservations: reservationRows.filter((r) => r.property_id === p.id).length,
  }));

  return {
    totalProperties: props.length,
    totalSpaces,
    assignedSpaces,
    availableNow,
    activeReservations,
    utilizationPct,
    utilizationSeries,
    reservationsByProperty,
    occupancy: { occupied, available },
  };
}

export interface ReportMetrics {
  utilizationPct: number;
  totalReleasedHours: number;
  totalReservedHours: number;
  guestPassCount: number;
  conflictCount: number;
  mostUsedProperties: { name: string; reservations: number }[];
  mostReleasedSpaces: { space: string; releases: number }[];
  mostActiveResidents: { name: string; reservations: number }[];
}

export async function getReportMetrics(
  organizationId: string,
): Promise<ReportMetrics> {
  const supabase = createClient();

  const [
    { data: properties },
    { data: spaces },
    { data: availabilities },
    { data: reservations },
    { data: visitorPasses },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("properties").select("id, name").eq("organization_id", organizationId),
    supabase.from("parking_spaces").select("id, space_number, property_id").eq("organization_id", organizationId),
    supabase.from("space_availabilities").select("parking_space_id, starts_at, ends_at").eq("organization_id", organizationId),
    supabase.from("reservations").select("property_id, reserved_by_resident_id, status, starts_at, ends_at").eq("organization_id", organizationId),
    supabase.from("visitor_passes").select("id").eq("organization_id", organizationId),
    supabase.from("profiles").select("id, first_name, last_name").eq("organization_id", organizationId),
  ]);

  const props = properties ?? [];
  const spaceRows = spaces ?? [];
  const availRows = availabilities ?? [];
  const reservationRows = reservations ?? [];
  const profileRows = profiles ?? [];

  const totalReleasedHours = availRows.reduce(
    (sum, a) => sum + hoursBetween(a.starts_at, a.ends_at),
    0,
  );
  const totalReservedHours = reservationRows
    .filter((r) => r.status === "confirmed" || r.status === "completed")
    .reduce((sum, r) => sum + hoursBetween(r.starts_at, r.ends_at), 0);

  const spaceLabel = new Map(
    spaceRows.map((s) => [s.id, s.space_number] as const),
  );
  const releaseCount = new Map<string, number>();
  for (const a of availRows) {
    releaseCount.set(
      a.parking_space_id,
      (releaseCount.get(a.parking_space_id) ?? 0) + 1,
    );
  }
  const mostReleasedSpaces = [...releaseCount.entries()]
    .map(([id, releases]) => ({ space: spaceLabel.get(id) ?? "—", releases }))
    .sort((a, b) => b.releases - a.releases)
    .slice(0, 5);

  const mostUsedProperties = props
    .map((p) => ({
      name: p.name,
      reservations: reservationRows.filter((r) => r.property_id === p.id).length,
    }))
    .sort((a, b) => b.reservations - a.reservations)
    .slice(0, 5);

  const residentName = new Map(
    profileRows.map(
      (p) => [p.id, `${p.first_name} ${p.last_name}`.trim()] as const,
    ),
  );
  const residentCount = new Map<string, number>();
  for (const r of reservationRows) {
    residentCount.set(
      r.reserved_by_resident_id,
      (residentCount.get(r.reserved_by_resident_id) ?? 0) + 1,
    );
  }
  const mostActiveResidents = [...residentCount.entries()]
    .map(([id, reservations]) => ({
      name: residentName.get(id) ?? "—",
      reservations,
    }))
    .sort((a, b) => b.reservations - a.reservations)
    .slice(0, 5);

  const totalSpaces = spaceRows.length;
  const assignedOrReserved = reservationRows.filter(
    (r) => r.status === "confirmed",
  ).length;
  const utilizationPct = totalSpaces
    ? Math.min(100, Math.round((assignedOrReserved / totalSpaces) * 100))
    : 0;

  return {
    utilizationPct,
    totalReleasedHours,
    totalReservedHours,
    guestPassCount: (visitorPasses ?? []).length,
    conflictCount: 0, // placeholder — enforced away by exclusion constraint
    mostUsedProperties,
    mostReleasedSpaces,
    mostActiveResidents,
  };
}
