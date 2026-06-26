import { createClient } from "@/lib/supabase/server";
import {
  computeDashboardMetrics,
  computeReportMetrics,
  type DashboardMetrics,
  type ReportMetrics,
} from "@/lib/metrics-compute";

export type { DashboardMetrics, ReportMetrics };

/**
 * Computes the headline dashboard metrics for an organization. RLS already
 * scopes every query to the caller's org, but we filter explicitly too for
 * defense in depth and clarity. The math lives in lib/metrics-compute.ts.
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

  return computeDashboardMetrics({
    properties: properties ?? [],
    spaces: spaces ?? [],
    assignments: assignments ?? [],
    availabilities: availabilities ?? [],
    reservations: reservations ?? [],
  });
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

  return computeReportMetrics({
    properties: properties ?? [],
    spaces: spaces ?? [],
    availabilities: availabilities ?? [],
    reservations: reservations ?? [],
    profiles: profiles ?? [],
    guestPassCount: (visitorPasses ?? []).length,
  });
}
