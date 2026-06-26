// ============================================================
// Pure insight generation — no database access. The async wrapper
// in lib/insights.ts fetches rows and delegates here. Rule-based
// for the MVP; this is the seam a real model provider slots behind.
// ============================================================

export interface Insight {
  title: string;
  detail: string;
  severity: "info" | "opportunity" | "watch";
}

export interface InsightInput {
  properties: { id: string; name: string }[];
  spaces: { id: string; property_id: string; level_or_zone: string | null }[];
  assignments: { parking_space_id: string }[];
  availabilities: { parking_space_id: string; starts_at: string }[];
  reservations: { starts_at: string; status: string }[];
  visitorPasses: { starts_at: string }[];
}

export function computeInsights(input: InsightInput): Insight[] {
  const { properties, spaces, assignments, availabilities, reservations, visitorPasses } =
    input;

  const insights: Insight[] = [];
  const assignedSet = new Set(assignments.map((a) => a.parking_space_id));

  // 1. Property with the most unused (unassigned) capacity.
  if (properties.length > 0 && spaces.length > 0) {
    const byProperty = properties.map((p) => {
      const total = spaces.filter((s) => s.property_id === p.id).length;
      const unassigned = spaces.filter(
        (s) => s.property_id === p.id && !assignedSet.has(s.id),
      ).length;
      return { name: p.name, total, unassigned };
    });
    const top = byProperty
      .filter((p) => p.total > 0)
      .sort((a, b) => b.unassigned - a.unassigned)[0];
    if (top && top.unassigned > 0) {
      insights.push({
        title: `${top.name} has the most unused parking capacity`,
        detail: `${top.unassigned} of ${top.total} spaces are unassigned. Consider converting some to flex or guest parking.`,
        severity: "opportunity",
      });
    }
  }

  // 2. Weekend visitor demand.
  const allDated = [
    ...visitorPasses.map((v) => v.starts_at),
    ...reservations.map((r) => r.starts_at),
  ];
  const weekend = allDated.filter((d) => {
    const day = new Date(d).getDay();
    return day === 0 || day === 6;
  }).length;
  if (allDated.length > 0 && weekend / allDated.length >= 0.4) {
    insights.push({
      title: "Visitor and overflow demand is highest on weekends",
      detail: `${Math.round((weekend / allDated.length) * 100)}% of bookings start on a weekend. Pre-stage guest spaces on Fridays.`,
      severity: "info",
    });
  }

  // 3. Frequently released zone.
  const releaseByZone = new Map<string, number>();
  const zoneOfSpace = new Map(
    spaces.map((s) => [s.id, s.level_or_zone ?? "Unzoned"] as const),
  );
  for (const a of availabilities) {
    const zone = zoneOfSpace.get(a.parking_space_id) ?? "Unzoned";
    releaseByZone.set(zone, (releaseByZone.get(zone) ?? 0) + 1);
  }
  const topZone = [...releaseByZone.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topZone && topZone[1] > 0) {
    insights.push({
      title: `Spaces in ${topZone[0]} are released frequently`,
      detail: `${topZone[1]} releases originated here. These spaces are good candidates for a shared flex pool.`,
      severity: "opportunity",
    });
  }

  // 4. Conversion suggestion.
  const unassignedCount = spaces.filter((s) => !assignedSet.has(s.id)).length;
  if (unassignedCount >= 3) {
    insights.push({
      title: `Consider converting ${Math.min(unassignedCount, 5)} underused spaces to flex parking`,
      detail:
        "Unassigned spaces generate no utilization. A flex pool lets residents and guests reserve them on demand.",
      severity: "opportunity",
    });
  }

  // 5. Low utilization watch.
  const confirmed = reservations.filter(
    (r) => r.status === "confirmed" || r.status === "completed",
  ).length;
  if (spaces.length > 0 && confirmed === 0) {
    insights.push({
      title: "No completed reservations yet",
      detail:
        "Encourage residents to release spaces they aren't using to kick-start utilization.",
      severity: "watch",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Everything looks healthy",
      detail:
        "No standout opportunities or risks detected from current data. Check back as activity grows.",
      severity: "info",
    });
  }

  return insights;
}
