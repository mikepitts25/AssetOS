import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Always run server-side on demand; never cache.
export const dynamic = "force-dynamic";

/**
 * Flips time-expired records to their terminal status by calling the
 * `expire_stale_records()` SQL function with the service-role key.
 *
 * Scheduling is handled in-database by the pg_cron job (see
 * 20260101000003_expiry.sql), so this route isn't on a schedule. It stays as an
 * optional manual "run now" trigger — call it with `Authorization: Bearer
 * ${CRON_SECRET}`. (It's also ready for a platform cron, e.g. Vercel Cron on a
 * Pro plan, if you ever want to drive expiry from outside the database.)
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await createAdminClient().rpc("expire_stale_records");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, ...counts });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
