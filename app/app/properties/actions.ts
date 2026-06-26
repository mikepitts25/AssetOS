"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth";
import { isManager } from "@/lib/roles";
import { recordAudit } from "@/lib/audit";

interface PropertyInput {
  name: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_region?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  description?: string;
}

function parse(formData: FormData): PropertyInput {
  const get = (k: string) => (formData.get(k) as string)?.trim() || undefined;
  return {
    name: get("name") ?? "",
    address_line_1: get("address_line_1"),
    address_line_2: get("address_line_2"),
    city: get("city"),
    state_region: get("state_region"),
    postal_code: get("postal_code"),
    country: get("country"),
    timezone: get("timezone") ?? "UTC",
    description: get("description"),
  };
}

export async function createProperty(formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx || !isManager(ctx.profile.role)) {
    return { error: "Not authorized" };
  }

  const input = parse(formData);
  if (!input.name) return { error: "Name is required" };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...input, organization_id: ctx.organization.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "property_created",
    entityType: "property",
    entityId: data.id,
    metadata: { name: input.name },
  });

  revalidatePath("/app/properties");
  return { success: true };
}

export async function updateProperty(id: string, formData: FormData) {
  const ctx = await getSessionContext();
  if (!ctx || !isManager(ctx.profile.role)) {
    return { error: "Not authorized" };
  }

  const input = parse(formData);
  if (!input.name) return { error: "Name is required" };

  const supabase = createClient();
  const { error } = await supabase
    .from("properties")
    .update(input)
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "property_updated",
    entityType: "property",
    entityId: id,
  });

  revalidatePath("/app/properties");
  revalidatePath(`/app/properties/${id}`);
  return { success: true };
}

export async function archiveProperty(id: string) {
  const ctx = await getSessionContext();
  if (!ctx || !isManager(ctx.profile.role)) {
    return { error: "Not authorized" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("properties")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);

  if (error) return { error: error.message };

  await recordAudit({
    organizationId: ctx.organization.id,
    actorProfileId: ctx.profile.id,
    action: "property_archived",
    entityType: "property",
    entityId: id,
  });

  revalidatePath("/app/properties");
  return { success: true };
}
