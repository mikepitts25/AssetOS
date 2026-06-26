import { describe, expect, it } from "vitest";

import {
  computeDashboardMetrics,
  computeReportMetrics,
  type DashboardInput,
  type ReportInput,
} from "@/lib/metrics-compute";

const NOW = new Date("2026-07-01T12:00:00Z");

describe("computeDashboardMetrics", () => {
  const input: DashboardInput = {
    properties: [
      { id: "p1", name: "Stuttgart Heights Apartments" },
      { id: "p2", name: "Acme Office" },
    ],
    spaces: [
      { id: "s1", property_id: "p1", status: "active" },
      { id: "s2", property_id: "p1", status: "active" },
      { id: "s3", property_id: "p2", status: "active" },
      { id: "s4", property_id: "p2", status: "active" },
    ],
    assignments: [{ parking_space_id: "s1" }],
    availabilities: [
      // available right now
      { status: "available", starts_at: "2026-07-01T08:00:00Z", ends_at: "2026-07-01T18:00:00Z" },
      // available but in the past
      { status: "available", starts_at: "2026-06-01T08:00:00Z", ends_at: "2026-06-01T18:00:00Z" },
      // not "available" status
      { status: "reserved", starts_at: "2026-07-01T08:00:00Z", ends_at: "2026-07-01T18:00:00Z" },
    ],
    reservations: [
      { property_id: "p1", status: "confirmed", starts_at: "2026-07-01T10:00:00Z", ends_at: "2026-07-01T14:00:00Z" },
      { property_id: "p2", status: "pending", starts_at: "2026-07-02T10:00:00Z", ends_at: "2026-07-03T14:00:00Z" },
      { property_id: "p1", status: "confirmed", starts_at: "2026-06-01T10:00:00Z", ends_at: "2026-06-01T14:00:00Z" },
    ],
  };

  const m = computeDashboardMetrics(input, NOW);

  it("counts totals", () => {
    expect(m.totalProperties).toBe(2);
    expect(m.totalSpaces).toBe(4);
    expect(m.assignedSpaces).toBe(1);
  });

  it("counts only currently-available windows", () => {
    expect(m.availableNow).toBe(1);
  });

  it("counts active (confirmed/pending, not yet ended) reservations", () => {
    expect(m.activeReservations).toBe(2);
  });

  it("derives occupancy and utilization from assignments + active reservations", () => {
    // occupied = assigned(1) + reserved-now(1) = 2 of 4
    expect(m.occupancy).toEqual({ occupied: 2, available: 2 });
    expect(m.utilizationPct).toBe(50);
  });

  it("groups reservations by property and truncates long names", () => {
    expect(m.reservationsByProperty).toEqual([
      { property: "Stuttgart Hei…", reservations: 2 },
      { property: "Acme Office", reservations: 1 },
    ]);
  });

  it("produces a 14-day utilization series in [0,100]", () => {
    expect(m.utilizationSeries).toHaveLength(14);
    for (const point of m.utilizationSeries) {
      expect(point.utilization).toBeGreaterThanOrEqual(0);
      expect(point.utilization).toBeLessThanOrEqual(100);
    }
    // The only in-window confirmed reservation covers 1 of 4 spaces => 25%.
    expect(Math.max(...m.utilizationSeries.map((p) => p.utilization))).toBe(25);
  });

  it("handles an empty org without dividing by zero", () => {
    const empty = computeDashboardMetrics(
      { properties: [], spaces: [], assignments: [], availabilities: [], reservations: [] },
      NOW,
    );
    expect(empty.utilizationPct).toBe(0);
    expect(empty.occupancy).toEqual({ occupied: 0, available: 0 });
  });
});

describe("computeReportMetrics", () => {
  const input: ReportInput = {
    properties: [{ id: "p1", name: "Stuttgart Heights" }],
    spaces: [
      { id: "s1", space_number: "G-01", property_id: "p1" },
      { id: "s2", space_number: "G-02", property_id: "p1" },
    ],
    availabilities: [
      { parking_space_id: "s1", starts_at: "2026-07-01T08:00:00Z", ends_at: "2026-07-01T10:00:00Z" },
      { parking_space_id: "s1", starts_at: "2026-07-01T08:00:00Z", ends_at: "2026-07-01T12:00:00Z" },
      { parking_space_id: "s2", starts_at: "2026-07-01T08:00:00Z", ends_at: "2026-07-01T09:00:00Z" },
    ],
    reservations: [
      { property_id: "p1", reserved_by_resident_id: "res-1", status: "confirmed", starts_at: "2026-07-01T08:00:00Z", ends_at: "2026-07-01T10:00:00Z" },
      { property_id: "p1", reserved_by_resident_id: "res-1", status: "completed", starts_at: "2026-07-01T08:00:00Z", ends_at: "2026-07-01T11:00:00Z" },
    ],
    profiles: [{ id: "res-1", first_name: "Alex", last_name: "Johnson" }],
    guestPassCount: 4,
  };

  const r = computeReportMetrics(input);

  it("sums released hours across all availabilities", () => {
    expect(r.totalReleasedHours).toBe(2 + 4 + 1);
  });

  it("sums reserved hours for confirmed and completed reservations only", () => {
    expect(r.totalReservedHours).toBe(2 + 3);
  });

  it("ranks most-released spaces by their label", () => {
    expect(r.mostReleasedSpaces).toEqual([
      { space: "G-01", releases: 2 },
      { space: "G-02", releases: 1 },
    ]);
  });

  it("ranks most-active residents by name", () => {
    expect(r.mostActiveResidents).toEqual([
      { name: "Alex Johnson", reservations: 2 },
    ]);
  });

  it("passes through the guest pass count", () => {
    expect(r.guestPassCount).toBe(4);
  });

  it("computes utilization from confirmed reservations over total spaces", () => {
    expect(r.utilizationPct).toBe(50);
  });
});
