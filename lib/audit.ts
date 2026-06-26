import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "property_created"
  | "property_updated"
  | "property_archived"
  | "space_created"
  | "space_updated"
  | "space_assigned"
  | "space_unassigned"
  | "availability_created"
  | "availability_cancelled"
  | "reservation_created"
  | "reservation_cancelled"
  | "visitor_pass_created"
  | "visitor_pass_cancelled"
  | "user_role_changed";

interface AuditInput {
  organizationId: string;
  actorProfileId: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Best-effort: failures are swallowed so an
 * auditing hiccup never breaks the primary action. Called from server
 * actions after a successful mutation.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("audit_logs").insert({
      organization_id: input.organizationId,
      actor_profile_id: input.actorProfileId,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("[audit] failed to record event", input.action, err);
  }
}
