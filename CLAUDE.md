# CLAUDE.md — AssetOS / ParkingOS

Context for any Claude Code session working in this repo. Read this first.

---

## What this project is

**AssetOS** is an AI-ready operating system for shared physical assets. The
first and only module built so far is **ParkingOS**: a private, multi-tenant
B2B SaaS for managing parking at apartment complexes, military housing, office
campuses, etc.

It is **not** a public peer-to-peer marketplace. Every organization gets a
private workspace; users only ever see data inside their own organization.

Core resident-facing loop:
1. A manager creates properties + parking spaces and **assigns** spaces to residents.
2. A resident **releases** their assigned space for a time window when away.
3. Another resident **reserves** that released space (double-booking is impossible).
4. Residents issue **guest passes**; managers oversee everything and see reports.

The architecture is deliberately generic enough to later support other asset
types (EV chargers, storage, conference rooms) — but **only parking is built**.

---

## Tech stack

- **Next.js 14 (App Router) + React 18 + TypeScript** (strict mode)
- **Tailwind CSS v3 + shadcn/ui** components + **lucide-react** icons
- **Recharts** for dashboard charts
- **Supabase**: PostgreSQL, Auth (email/password), Row Level Security
- Hosting target: **Vercel** (frontend) + **Supabase** (backend)
- No Stripe, no real AI calls, no notifications yet — these are intentional
  future hooks, not missing work.

---

## Repository map

```
app/
  (public)/page.tsx          landing page
  (auth)/sign-in, sign-up    email/password auth (client forms)
  onboarding/                bootstraps an org+profile for brand-new signups
                             (uses the service-role admin client)
  app/                       protected tree; app/layout.tsx guards auth
    dashboard, properties, properties/[id], spaces, spaces/[id],
    residents, reservations, guest-passes, my-space, my-reservations,
    reports, ai-insights, settings, admin/organizations
    */actions.ts             server actions (mutations + audit + revalidate)
  app/api/cron/expire-stale/route.ts  service-role cron endpoint (Vercel Cron)
components/
  ui/                        shadcn primitives (button, dialog, table, toast…)
  layout/                    app-shell, sidebar, topbar, nav-config
  dashboard/ properties/ spaces/ reservations/ guest-passes/ parking/ residents/
  settings/                  edit-profile dialog
  shared/                    page-header, empty-state, status-badge
lib/
  supabase/{client,server,admin,middleware}.ts   3 client flavors + SSR refresh
  auth.ts roles.ts dates.ts availability.ts audit.ts utils.ts
  metrics.ts insights.ts     async fetchers → delegate to *-compute.ts
  metrics-compute.ts insights-compute.ts   PURE logic (no DB) — unit-tested
types/
  domain.ts                  enums + labels (single source of truth)
  database.ts                hand-written Supabase Database type (see gotchas)
supabase/
  migrations/2026010100000{0,1,2,3}_*.sql   init / rls / availability / expiry
  seed.sql                   demo org, 5 users, 3 properties, 30+ spaces, data
  setup.sql                  ONE-SHOT bundle = 4 migrations + seed, for SQL Editor
  config.toml                local Supabase config (email confirmation OFF)
test/                        Vitest suites (pure logic) + supabase-server stub
vercel.json                  Vercel Cron schedule for /api/cron/expire-stale
middleware.ts                refreshes session, guards /app, redirects auth pages
```

---

## Key design decisions (the "why")

- **Tenant isolation is enforced in the database, not just the app.** RLS is on
  for every table. App-layer role checks (`lib/roles.ts`, `can.*`) are a UX/defense
  layer; the real boundary is RLS + `SECURITY DEFINER` helpers
  (`current_org_id()`, `current_user_role()`, `is_org_manager()`, …).
- **Double-booking is impossible by construction.** `reservations` has a
  `tstzrange` GiST **exclusion constraint** over `(parking_space_id, time_range)`
  for pending/confirmed rows. `parking_assignments` has a partial unique index
  for one active assignment per space. The app also pre-checks via
  `is_space_available()` for a friendly error, and reserves through the atomic
  `reserve_space()` SQL function.
- **Three Supabase clients, used deliberately:** browser (`client.ts`), RLS-bound
  server (`server.ts`), and service-role `admin.ts` which **bypasses RLS** and is
  used in exactly one place — onboarding, where a new user has no org/profile yet
  so normal policies can't apply. `admin.ts` is server-only; never import it client-side.
- **Database types are hand-written** (`types/database.ts`) instead of generated,
  so the repo builds without the Supabase CLI connected.
- **Auth model:** managers can "Add resident," creating an `invited` profile with
  `auth_user_id = null`. Seed users are pre-wired to auth accounts. There is **no
  invite/claim flow yet** — see "Known gaps."

---

## Current status

✅ Type-checks, lints, and builds clean (`npm run typecheck && npm run lint && npm run build`).
✅ All 20 routes compile. Full feature set per the original MVP spec is implemented.
✅ Pushed to `origin/main` and `origin/claude/assetos-parking-mvp-gzt5xw` (in sync).

✅ **Wired up to live hosted Supabase + verified end-to-end** (2026-06-26, local
Mac session). Applied `supabase/setup.sql` to project `cjgnmrjrrbfeqjbpvddz`
(region **eu-west-1**) via psql through the **pooler** (`aws-0-eu-west-1.pooler.supabase.com:5432`)
— the direct `db.*.supabase.co` host is IPv6-only and unreachable from a v4-only
network. Verified: all 5 demo logins return 200, and a real browser sign-in as
`mike@assetos.demo` renders the dashboard with live data (3 properties, 32 spaces).
`.env.local` holds the URL + publishable key (service-role key left blank — only
new-signup onboarding needs it). DB tables: note the guest-pass table is
`visitor_passes`.
  - **One fix was required:** the seed inserted `auth.users` with NULL token
    columns (`confirmation_token`, etc.), which makes GoTrue 500 with "Database
    error querying schema" on login. Fixed in `seed.sql` + `setup.sql` by
    coalescing those columns to `''` after the insert.

### Known gaps (what's left for a fully working MVP)

1. ~~**Apply the schema to a Supabase project + verify.**~~ ✅ Done (see above).
2. ~~**Invite/claim flow.**~~ ✅ Done (2026-06-26). On reaching `/onboarding`, a
   signed-up user whose email matches an unclaimed (`auth_user_id is null`)
   `invited` profile now sees a **"You've been invited — Join {org}"** card; the
   `claimInvite` action attaches `auth_user_id` + sets `status = active`, so they
   land in the manager's org with their assigned role instead of a fresh empty
   workspace. `createWorkspace` also short-circuits to the same claim defensively.
   Both paths use the **admin client** (RLS hides the cross-org invite from a user
   with no org yet), so this requires `SUPABASE_SERVICE_ROLE_KEY` — the onboarding
   page degrades to the create-workspace form when the key is absent. Verified
   end-to-end against the live DB. Hardening left for later: matches on email
   alone (no invite token), so possession of the address = claim.
3. ~~**Stale statuses.**~~ ✅ Done (2026-06-26). Migration `20260101000003_expiry.sql`
   adds `expire_stale_records()` (SECURITY DEFINER, idempotent) flipping
   `space_availabilities` available→expired, `visitor_passes` active→expired, and
   `reservations` confirmed→completed once `ends_at < now()`. Two triggers, use
   either: an in-DB **pg_cron** job (`*/15`, enabled + verified on the live DB),
   and a portable **`/api/cron/expire-stale`** route (service-role, bearer
   `CRON_SECRET`) wired to **Vercel Cron** via `vercel.json`. Verified end-to-end
   (counts + idempotency) against the live DB.
4. ~~**No self-service profile editing.**~~ ✅ Done (2026-06-26). Settings has an
   **Edit profile** dialog → `updateOwnProfile` server action
   (`app/app/settings/actions.ts`) updating first/last name, phone, unit on the
   caller's own row. Only personal fields are writable (never role/email/org), so
   it can't self-escalate despite the auth_user_id-scoped RLS policy. Audited +
   verified end-to-end in the browser.
5. ~~**No automated tests.**~~ ✅ Done (2026-06-26). **Vitest** added (`npm test`),
   41 tests across `test/*.test.ts` covering roles, dates, utils, `isValidWindow`,
   and the metrics/insights engines. To make the metric/insight math testable
   without a DB, the pure logic was extracted into `lib/metrics-compute.ts` and
   `lib/insights-compute.ts` (the async fetchers in `lib/metrics.ts` /
   `lib/insights.ts` now just fetch + delegate; public API unchanged). A vitest
   alias stubs `@/lib/supabase/server` so pure modules import cleanly in node.

Intentionally deferred (per spec, not "missing"): Stripe/billing, real AI, extra
asset types, email/SMS/push, QR scan check-in, native app, enforcement/towing.

---

## Session history (how we got here)

- **Initial build (this repo started empty except a README).** Scaffolded the
  entire Next.js + Supabase project from scratch: config, migrations, RLS, seed,
  all pages/components/actions, landing page, auth, and dashboards. Committed as
  "Build AssetOS / ParkingOS MVP foundation" (`f0601af`).
- **Two non-obvious fixes during that build, worth remembering:**
  - **`never`-typed queries.** Every typed Supabase query resolved to `never`.
    Root cause: `Views: Record<string, never>` in the Database type — supabase-js
    computes `Tables & Exclude<Views, ''>`, and a string index signature there
    intersects every table down to `never`. Fixed by using `{ [_ in never]: never }`
    for `Views`/`Enums`, and making row types `type` aliases (not `interface`) so
    they satisfy `Record<string, unknown>`.
  - **ssr/supabase-js version skew.** `@supabase/ssr@0.5.2` against
    `supabase-js@2.108` made `createServerClient<Database>` drop the generic
    (queries → `never`, cookie callbacks → implicit `any`). Fixed by upgrading
    `@supabase/ssr` to `^0.12.0` (peer: supabase-js ^2.108).
  - Also bumped Next.js to `^14.2.35` for the Dec-2025 security advisory.
- **Pushed to `main`** at the user's explicit request.
- **Supabase connection attempt.** User supplied project URL + a new-style
  **publishable key** (`sb_publishable_…`, the modern anon-key replacement —
  works with our client). Wrote `.env.local` (gitignored).
- **Hit a hard wall:** this work happens in a **sandboxed Linux cloud session**.
  The agent's egress proxy **denies outbound to `*.supabase.co`** (org network
  policy — 403 on CONNECT), and the session cannot see the user's local Mac
  filesystem (`/Users/...` doesn't exist here). So the schema could not be applied
  nor connectivity verified from the cloud session.
- **Decision:** finish setup from a place that can reach Supabase — a **local
  Claude Code session on the user's Mac** (`/Users/mike/AppIdeas/AssetOS`), which
  can reach both the local files and Supabase. Added `supabase/setup.sql` (one-shot
  bundle) and this file to hand off cleanly.

### If you are a fresh **local** session picking this up
Your job is most likely: **wire up Supabase and verify the app runs.** Follow
README → "Connect to Supabase," then confirm login as `mike@assetos.demo` /
`Password123!`. After that, the highest-value code task is the invite/claim flow
(gap #2 above).

---

## Conventions / guardrails

- Server actions live in `app/**/actions.ts`, re-check role with `getSessionContext()`
  + `lib/roles.ts`, write an audit entry via `recordAudit()`, and `revalidatePath()`.
- Add new enums/labels to `types/domain.ts` and the row shape to `types/database.ts`
  together. Keep status→badge mapping in `components/shared/status-badge.tsx`.
- **Never commit secrets.** `.env.local` is gitignored. The `NEXT_PUBLIC_*` values
  (URL + publishable key) are public by design; the `SUPABASE_SERVICE_ROLE_KEY`
  (`sb_secret_…`) is not — keep it out of anything committed.
- Run `npm run typecheck && npm run lint && npm test && npm run build` before pushing.
- Pure, DB-free logic goes in `*-compute.ts` files with Vitest coverage; the async
  `lib/*.ts` wrappers only fetch rows and delegate. Don't import `@/lib/supabase/*`
  into a module you want unit-tested.
