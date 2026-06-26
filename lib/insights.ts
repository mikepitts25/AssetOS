import { createClient } from "@/lib/supabase/server";
import { computeInsights, type Insight } from "@/lib/insights-compute";

export type { Insight };

/**
 * Fetches org data and delegates to the deterministic rule-based generator in
 * lib/insights-compute.ts. The signature (org id in, insights out) is the seam
 * a real model provider (OpenAI, Anthropic, ...) will slot behind later without
 * the UI changing.
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

  return computeInsights({
    properties: properties ?? [],
    spaces: spaces ?? [],
    assignments: assignments ?? [],
    availabilities: availabilities ?? [],
    reservations: reservations ?? [],
    visitorPasses: visitorPasses ?? [],
  });
}
