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
components/
  ui/                        shadcn primitives (button, dialog, table, toast…)
  layout/                    app-shell, sidebar, topbar, nav-config
  dashboard/ properties/ spaces/ reservations/ guest-passes/ parking/ residents/
  shared/                    page-header, empty-state, status-badge
lib/
  supabase/{client,server,admin,middleware}.ts   3 client flavors + SSR refresh
  auth.ts roles.ts dates.ts metrics.ts insights.ts availability.ts audit.ts utils.ts
types/
  domain.ts                  enums + labels (single source of truth)
  database.ts                hand-written Supabase Database type (see gotchas)
supabase/
  migrations/2026010100000{0,1,2}_*.sql   init / rls / availability
  seed.sql                   demo org, 5 users, 3 properties, 30+ spaces, data
  setup.sql                  ONE-SHOT bundle = 3 migrations + seed, for SQL Editor
  config.toml                local Supabase config (email confirmation OFF)
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

⛔ **Not yet running against a live database.** No Supabase project has been wired
up and verified end-to-end. The code is complete but the runtime flows
(auth, releases, reservations) have not been exercised against real data.

### Known gaps (what's left for a fully working MVP)

1. **Apply the schema to a Supabase project + verify.** Top priority. See README
   "Connect to Supabase." Until this is done nothing works at runtime.
2. **Invite/claim flow.** A manager-added (`invited`) resident who signs up with
   that email currently gets a brand-new empty org via onboarding instead of being
   linked to their existing profile. Fix: on signup, match an existing invited
   profile by email and attach `auth_user_id`. Seeded demo users are unaffected.
3. **Stale statuses.** No scheduled job flips `available → expired` or guest passes
   `active → expired` after their end time. Time-window queries handle "available
   now," but stored status fields go stale without a cron.
4. **No self-service profile editing** (Settings is read-only).
5. **No automated tests.**

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
- Run `npm run typecheck && npm run lint && npm run build` before pushing.
