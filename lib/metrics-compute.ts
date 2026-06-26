import { subDays, startOfDay, format } from "date-fns";

import { hoursBetween } from "@/lib/dates";

// ============================================================
// Pure metric computation — no database access. The async
// fetchers in lib/metrics.ts pull the rows and delegate here so
// the math is deterministic and unit-testable (inject `now`).
// ============================================================

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

export interface DashboardInput {
  properties: { id: string; name: string }[];
  spaces: { id: string; property_id: string; status: string }[];
  assignments: { parking_space_id: string }[];
  availabilities: { starts_at: string; ends_at: string; status: string }[];
  reservations: {
    property_id: string;
    status: string;
    starts_at: string;
    ends_at: string;
  }[];
}

export function computeDashboardMetrics(
  input: DashboardInput,
  now: Date = new Date(),
): DashboardMetrics {
  const { properties, spaces, assignments, availabilities, reservations } =
    input;

  const totalSpaces = spaces.length;
  const assignedSpaces = new Set(assignments.map((a) => a.parking_space_id))
    .size;

  const availableNow = availabilities.filter(
    (a) =>
      a.status === "available" &&
      new Date(a.starts_at) <= now &&
      new Date(a.ends_at) >= now,
  ).length;

  const activeReservations = reservations.filter(
    (r) =>
      (r.status === "confirmed" || r.status === "pending") &&
      new Date(r.ends_at) >= now,
  ).length;

  const reservedSpaceCount = reservations.filter(
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

  const utilizationSeries = Array.from({ length: 14 }).map((_, i) => {
    const day = startOfDay(subDays(now, 13 - i));
    const dayEnd = subDays(now, 13 - i);
    const activeThatDay = reservations.filter(
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

  const reservationsByProperty = properties.map((p) => ({
    property: p.name.length > 14 ? `${p.name.slice(0, 13)}…` : p.name,
    reservations: reservations.filter((r) => r.property_id === p.id).length,
  }));

  return {
    totalProperties: properties.length,
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

export interface ReportInput {
  properties: { id: string; name: string }[];
  spaces: { id: string; space_number: string; property_id: string }[];
  availabilities: {
    parking_space_id: string;
    starts_at: string;
    ends_at: string;
  }[];
  reservations: {
    property_id: string;
    reserved_by_resident_id: string;
    status: string;
    starts_at: string;
    ends_at: string;
  }[];
  profiles: { id: string; first_name: string; last_name: string }[];
  guestPassCount: number;
}

export function computeReportMetrics(input: ReportInput): ReportMetrics {
  const { properties, spaces, availabilities, reservations, profiles } = input;

  const totalReleasedHours = availabilities.reduce(
    (sum, a) => sum + hoursBetween(a.starts_at, a.ends_at),
    0,
  );
  const totalReservedHours = reservations
    .filter((r) => r.status === "confirmed" || r.status === "completed")
    .reduce((sum, r) => sum + hoursBetween(r.starts_at, r.ends_at), 0);

  const spaceLabel = new Map(spaces.map((s) => [s.id, s.space_number] as const));
  const releaseCount = new Map<string, number>();
  for (const a of availabilities) {
    releaseCount.set(
      a.parking_space_id,
      (releaseCount.get(a.parking_space_id) ?? 0) + 1,
    );
  }
  const mostReleasedSpaces = [...releaseCount.entries()]
    .map(([id, releases]) => ({ space: spaceLabel.get(id) ?? "—", releases }))
    .sort((a, b) => b.releases - a.releases)
    .slice(0, 5);

  const mostUsedProperties = properties
    .map((p) => ({
      name: p.name,
      reservations: reservations.filter((r) => r.property_id === p.id).length,
    }))
    .sort((a, b) => b.reservations - a.reservations)
    .slice(0, 5);

  const residentName = new Map(
    profiles.map(
      (p) => [p.id, `${p.first_name} ${p.last_name}`.trim()] as const,
    ),
  );
  const residentCount = new Map<string, number>();
  for (const r of reservations) {
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

  const totalSpaces = spaces.length;
  const assignedOrReserved = reservations.filter(
    (r) => r.status === "confirmed",
  ).length;
  const utilizationPct = totalSpaces
    ? Math.min(100, Math.round((assignedOrReserved / totalSpaces) * 100))
    : 0;

  return {
    utilizationPct,
    totalReleasedHours,
    totalReservedHours,
    guestPassCount: input.guestPassCount,
    conflictCount: 0, // enforced away by the exclusion constraint
    mostUsedProperties,
    mostReleasedSpaces,
    mostActiveResidents,
  };
}
