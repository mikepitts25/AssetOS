import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Always run server-side on demand; never cache.
export const dynamic = "force-dynamic";

/**
 * Flips time-expired records to their terminal status by calling the
 * `expire_stale_records()` SQL function with the service-role key.
 *
 * Drive it with Vercel Cron (see vercel.json) — Vercel automatically sends
 * `Authorization: Bearer ${CRON_SECRET}` when the CRON_SECRET env var is set.
 * The same endpoint doubles as a manual "run now" trigger. If you instead rely
 * on the in-database pg_cron schedule, this route is simply unused.
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
