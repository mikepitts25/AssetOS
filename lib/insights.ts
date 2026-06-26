import { createClient } from "@/lib/supabase/server";

export interface Insight {
  title: string;
  detail: string;
  severity: "info" | "opportunity" | "watch";
}

/**
 * Deterministic insight generator. This is intentionally rule-based for the
 * MVP — the function signature (org id in, insights out) is the seam a real
 * model provider (OpenAI, Anthropic, ...) will slot behind later without the
 * UI changing.
 */
export async function generateInsights(
  organizationId: string,
): Promise<Insight[]> {
  const supabase = createClient();

  const [
    { data: properties },
    { data: spaces },
    { data: assignments },
    { data: availabilities },
    { data: reservations },
    { data: visitorPasses },
  ] = await Promise.all([
    supabase.from("properties").select("id, name").eq("organization_id", organizationId),
    supabase.from("parking_spaces").select("id, property_id, level_or_zone").eq("organization_id", organizationId),
    supabase.from("parking_assignments").select("parking_space_id").eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("space_availabilities").select("parking_space_id, starts_at").eq("organization_id", organizationId),
    supabase.from("reservations").select("starts_at, status").eq("organization_id", organizationId),
    supabase.from("visitor_passes").select("starts_at").eq("organization_id", organizationId),
  ]);

  const insights: Insight[] = [];
  const spaceRows = spaces ?? [];
  const propertyRows = properties ?? [];
  const assignedSet = new Set(
    (assignments ?? []).map((a) => a.parking_space_id),
  );

  // 1. Property with the most unused (unassigned) capacity.
  if (propertyRows.length > 0 && spaceRows.length > 0) {
    const byProperty = propertyRows.map((p) => {
      const total = spaceRows.filter((s) => s.property_id === p.id).length;
      const unassigned = spaceRows.filter(
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
    ...(visitorPasses ?? []).map((v) => v.starts_at),
    ...(reservations ?? []).map((r) => r.starts_at),
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
    spaceRows.map((s) => [s.id, s.level_or_zone ?? "Unzoned"] as const),
  );
  for (const a of availabilities ?? []) {
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
  const unassignedCount = spaceRows.filter(
    (s) => !assignedSet.has(s.id),
  ).length;
  if (unassignedCount >= 3) {
    insights.push({
      title: `Consider converting ${Math.min(unassignedCount, 5)} underused spaces to flex parking`,
      detail:
        "Unassigned spaces generate no utilization. A flex pool lets residents and guests reserve them on demand.",
      severity: "opportunity",
    });
  }

  // 5. Low utilization watch.
  const confirmed = (reservations ?? []).filter(
    (r) => r.status === "confirmed" || r.status === "completed",
  ).length;
  if (spaceRows.length > 0 && confirmed === 0) {
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
