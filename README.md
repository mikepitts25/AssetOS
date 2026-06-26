# AssetOS — ParkingOS

**The AI-ready operating system for shared physical assets.** AssetOS turns
underused parking into managed, reservable infrastructure. Start with parking,
expand to every shared physical asset (EV chargers, storage, conference rooms,
and more).

This repository contains the MVP of **ParkingOS**, the first AssetOS module: a
private, multi-tenant SaaS for property managers, apartment communities,
offices, and military housing.

---

## Product overview

ParkingOS gives each organization a private workspace to:

- Create properties and parking spaces
- Assign spaces to residents
- Let residents **release** their assigned space for a time window
- Let other residents **reserve** released spaces (no double-booking)
- Issue **guest parking passes** with scannable tokens
- Track **utilization** and view **AI-ready insights**

It is built as serious B2B SaaS: clean multi-tenant data model, Row Level
Security, role-based access, and an architecture designed to grow beyond
parking.

### Roles

| Role | Capabilities |
| --- | --- |
| `platform_admin` | See all organizations; manage global/demo data |
| `org_admin` | Manage one org, properties, managers, reports, roles |
| `property_manager` | Manage properties, spaces, assignments, reservations |
| `resident` | View/release assigned space, reserve spaces, guest passes |

---

## Tech stack

- **Next.js (App Router) + React + TypeScript** (strict mode)
- **Tailwind CSS** + **shadcn/ui** components + **lucide-react** icons
- **Recharts** for dashboard charts
- **Supabase**: PostgreSQL, Auth (email/password), Row Level Security
- Hosting target: **Vercel** (frontend) + **Supabase** (backend)

Architecture hooks are left for **Stripe** (billing), **OpenAI/Anthropic**
(AI insights), and additional asset types — none are implemented in the MVP.

---

## Local setup

### 1. Prerequisites

- Node.js 18.18+ (or 20+)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local Postgres/Auth)

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Copy the example file and fill in your Supabase keys:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — it is used by onboarding
> (workspace bootstrap) and never exposed to the browser. Never commit real
> secrets.

---

## Connect to Supabase (quickstart for this project)

This is the fastest path to a running app against the existing hosted Supabase
project. **Run these steps somewhere that can reach Supabase** — your local
machine works; a sandboxed cloud session may be blocked by network policy (see
note at the bottom).

### 1. Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://cjgnmrjrrbfeqjbpvddz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_d3P7N0sbDUllNaW4xOhBOg_bq_Di2TH
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- The `NEXT_PUBLIC_*` values are public by design (the `sb_publishable_…` key is
  the modern replacement for the anon key and works with our client).
- `SUPABASE_SERVICE_ROLE_KEY`: paste the project's **secret** key (`sb_secret_…`
  from **Project Settings → API**). Optional for the demo — only the new-signup
  onboarding flow needs it; the seeded demo logins work without it.

### 2. Apply the schema + demo data (one paste)

Open the **Supabase dashboard → SQL Editor**, paste the entire contents of
[`supabase/setup.sql`](supabase/setup.sql), and click **Run**. That single file
bundles the three migrations (in order) plus the demo seed. Your browser talks
to Supabase directly, so no special network access is required.

### 3. Run the app

```bash
npm install
npm run dev          # http://localhost:3000
```

Log in as `mike@assetos.demo` / `Password123!` (see the full demo table below).

> **Cloud-session note:** if you're running Claude Code in a sandboxed cloud
> environment, outbound access to `*.supabase.co` may be denied by the org
> network policy (you'll see `403` on CONNECT through the egress proxy). In that
> case, apply `setup.sql` from your browser and run the app locally, **or** start
> a cloud session whose network policy allows `supabase.co`. A cloud session
> cannot access a local path like `/Users/<you>/...` — the only bridge to your
> machine is GitHub.

---

## Supabase setup

### Option A — Local Supabase (recommended for the demo)

```bash
# Start local Postgres + Auth + Studio
supabase start

# Apply migrations and seed demo data in one step
supabase db reset
```

`supabase start` prints your local `API URL`, `anon key`, and
`service_role key` — copy those into `.env.local`.

### Option B — Hosted Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the migration files in order:
   - `supabase/migrations/20260101000000_init.sql`
   - `supabase/migrations/20260101000001_rls.sql`
   - `supabase/migrations/20260101000002_availability.sql`
3. (Optional) Run `supabase/seed.sql` to load demo data.
4. Copy the project URL and keys from **Project Settings → API** into
   `.env.local`.

### How migrations work

- **`20260101000000_init.sql`** — enum types, all tables, indexes, the
  `updated_at` trigger, the one-active-assignment constraint, and a
  `tstzrange` **exclusion constraint** that makes double-booking impossible.
- **`20260101000001_rls.sql`** — enables RLS on every table and adds policies
  for org isolation + role-based and owner-based access. Includes
  `SECURITY DEFINER` helpers (`current_org_id()`, `current_user_role()`, …).
- **`20260101000002_availability.sql`** — `is_space_available()`,
  `availability_covers()`, and the atomic `reserve_space()` function used by
  the reservation flow.

---

## How to seed demo data

```bash
# Local — runs supabase/seed.sql automatically
supabase db reset

# Hosted — paste supabase/seed.sql into the SQL editor and run it
```

---

## Run the dev server

```bash
npm run dev
# http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run start      # run the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## Demo user instructions

The seed creates the **AssetOS Demo Community** organization with these users
(password for all: **`Password123!`**):

| Email | Role | Try this |
| --- | --- | --- |
| `mike@assetos.demo` | org_admin | Full dashboard, reports, AI insights |
| `sarah@assetos.demo` | property_manager | Properties, spaces, reservations |
| `alex@assetos.demo` | resident | **My Space → Release**, guest passes |
| `maria@assetos.demo` | resident | **My Reservations → Reserve** a space |
| `david@assetos.demo` | resident | View reservation history |

### Suggested demo walkthrough

1. Sign in as **alex@assetos.demo** → **My Space** → *Release my space*.
2. Sign in as **maria@assetos.demo** → **My Reservations** → *Reserve* the
   released space (try overlapping times to see double-booking blocked).
3. Sign in as **sarah@assetos.demo** → **Reservations** to oversee/cancel, and
   **Dashboard / Reports** for utilization.
4. Create a **Guest Pass** as any resident to see the generated token.

Signing up with a brand-new email creates a fresh workspace via the onboarding
flow (you become its `org_admin`).

---

## Project structure

```
app/
  (public)/page.tsx        # landing page
  (auth)/sign-in, sign-up  # auth
  onboarding/              # workspace bootstrap for new signups
  app/                     # protected dashboard (layout guards auth)
    dashboard, properties, spaces, residents, reservations,
    guest-passes, my-space, my-reservations, reports,
    ai-insights, settings, admin/organizations
components/                # ui (shadcn), layout, dashboard, feature dialogs
lib/                       # supabase clients, auth, roles, dates, metrics, audit
types/                     # database + domain types
supabase/                  # migrations + seed.sql + config.toml
```

---

## Security notes

- **RLS everywhere** — every tenant table enforces `organization_id` scoping;
  residents can only modify their own releases/reservations/guest passes.
- **Server-side authorization** — server actions re-check roles; the client
  never decides permissions.
- **Audit log** — important events (`property_created`, `space_assigned`,
  `reservation_created`, …) are written to `audit_logs`.
- **No double-booking** — guaranteed by a Postgres exclusion constraint, with
  a friendly app-level pre-check.
- Service-role key is server-only; secrets live in `.env.local` (gitignored).

---

## Future roadmap

Architected for, but intentionally **not** built in this MVP:

- Stripe billing & paid parking rentals · dynamic pricing
- Real AI insights (model-driven recommendations, fraud detection)
- EV charging, storage units, conference rooms — additional asset types
- License-plate recognition · QR scan check-in · towing/enforcement workflows
- Email / SMS / push notifications · calendar integration
- Resident & manager invite links · native mobile app

---

_AssetOS — shared asset infrastructure. Built for property operators._
