# Rabbit Verse — Project Status

> **What this doc is:** the single place that answers *"what is the plan, and what's been done so far?"*
> Read the top three sections to get oriented in 60 seconds. The **Session Log** at the bottom
> records what changed each working session, newest first.
>
> **How it's kept current:** at the end of a session Rifat says "update the status doc." Claude then
> checks what changed since the last entry and appends a new Session Log entry + ticks the roadmap.
>
> **Full detail lives elsewhere** — this is a summary:
> - Spec & phased plan: `C:\Users\User\.claude\plans\you-are-my-senior-peaceful-pearl.md`
> - Design system (colors, themes, philosophy): [`design.md`](design.md)

_Last updated: 2026-07-23_

---

## 1. Status at a glance

**Phase: Backend wiring — auth done, data next.** The **entire front-end is built and alive** on
**sample data** (`src/lib/sample-data.ts`). The **Supabase auth layer is now code-complete** (Google
sign-in + single-email allowlist, session `proxy.ts`, full RLS schema), but the app still **defaults to
demo mode** until real keys are added, and section reads/writes are not migrated to the DB yet.

**Next milestone:** create the Supabase project (`SUPABASE_SETUP.md`), then migrate each section from
sample data to real persistence — Expenses first.

Legend: ✅ done · 🟡 partial / UI-only (no real data) · ⬜ not started

---

## 2. The plan (one-screen summary)

**Rabbit Verse** is a **private, single-user life-tracking PWA** for Rifat. It turns four life areas —
**Projects, Workout, Expenses, Mental Health** — into visible weekly/monthly/yearly trends, a
GitHub-style activity **heatmap**, and a combined **"All"** dashboard with rule-based encouragement.
Dark by default, calm and premium, with a code-drawn **SVG rabbit mascot** that reacts to progress.

- **Who:** Rifat only. Google sign-in locked to a single-email allowlist. Public URL, private data.
- **Stack:** Next.js 16.2 (App Router, Turbopack) + React 19.2 · Tailwind v4 + shadcn/ui · `motion` v12 ·
  Recharts 3.10 · Supabase (Postgres + Google auth + `@supabase/ssr`, Next 16 uses `proxy.ts`). Free tiers.
- **Rules:** all "today/yesterday", streaks, and heatmap buckets computed in **Asia/Dhaka (UTC+6)**.
  Backfill window = **today + yesterday only**, then locked. Currency = **৳ BDT**. English only.
- **Later:** Phase 1.5 = per-exercise logging, seasonal themes, data export. v2 = AI "type-what-I-did"
  chatbot, weather, illustrated mascot.

---

## 3. Roadmap & progress

### Phase 1 — Foundation
- 🟡 App shell — sidebar + mobile nav, section routing, greeting *(built; not behind auth)*
- ✅ Theme system — dark default + light, theme toggle, design tokens
- 🟡 PWA — web manifest present (`src/app/manifest.ts`); **service worker not added**
- 🟡 Supabase client wiring — browser/server clients + `proxy.ts` session refresh built (`src/lib/supabase/`, `src/proxy.ts`); **Supabase project not created yet**
- 🟡 Google OAuth + single-email allowlist — `/login`, `app/auth/actions.ts`, `auth/callback` built; needs a live project to test
- ✅ Row-Level Security (RLS) — full schema + policies + on-signup seed trigger in `supabase/migrations/0001_init.sql`

### Phase 2 — Reusable primitives
- ✅ Chart wrappers — sparkline, trend (line/area), radar balance
- ✅ Progress ring + animated count-up
- ✅ Activity heatmap component
- ✅ SVG rabbit mascot component
- 🟡 Logging-input pattern (today+yesterday window) — quick-add UI exists; **writes nowhere real**

### Phase 3 — Sections (schema + inputs + graphs + heatmap each)
- 🟡 Expenses — page + charts on sample data; **no schema / persistence**
- 🟡 Projects — page UI on sample data; no persistence
- 🟡 Workout — page UI on sample data; no persistence (per-exercise = Phase 1.5)
- 🟡 Mental Health — page UI on sample data; no persistence

### Phase 4 — All / Dashboard
- 🟡 Combined cards + trend + radar + timeline + section cards (UI on sample data)
- ✅ Motivation engine (`src/lib/motivation.ts`) — rule-based headline + "rabbit says"

### Phase 5 — Mood Mode & mascot wiring
- 🟡 Life-score / mood-state engine (`src/lib/life-score.ts`) — computes score & tone from signals
- 🟡 Mascot state derived from activity/streak (wired to sample signals)

### Phase 6 — Reminders
- ⬜ Web Push subscription storage
- ⬜ Supabase `pg_cron` + Edge Function sending VAPID push at Dhaka-local reminder time

### Phase 1.5 (after v1)
- ⬜ Per-exercise logging (sets/reps/weight) + strength graphs
- ⬜ Seasonal accent themes
- ⬜ Data export (JSON/CSV)

### v2 (design-for, not building)
- ⬜ AI chatbot (type a sentence → update dashboards)
- ⬜ Weather integration · illustrated mascot · AI-written advice

---

## 4. Current-state snapshot (what exists in the code today)

**Everything below renders from `src/lib/sample-data.ts` (a seeded PRNG) — not a database.**

- **App shell:** `src/app/(app)/layout.tsx`, `components/layout/sidebar.tsx`, `mobile-nav.tsx`
- **Pages:** All/overview `(app)/page.tsx`; `projects`, `workout`, `expenses`, `mental-health`,
  `settings`, `quick-add` — all under `src/app/(app)/`
- **Dashboard pieces:** `components/dashboard/` — stat-card, section-card, panel, page-header,
  activity-heatmap, today-timeline, rabbit-says, ai-insight
- **Charts:** `components/charts/` — sparkline, trend-chart, radar-balance; `components/ui/` — ring, count-up
- **Mascot:** `components/mascot/rabbit.tsx`
- **Logic libs:** `lib/` — dates (Dhaka-aware), types, nav, life-score, motivation, sample-data, utils
- **Theming:** `components/theme-provider.tsx`, `theme-toggle.tsx`, `app/globals.css` tokens; `next-themes`
- **PWA:** `app/manifest.ts` (no service worker / offline handling yet)

**Now present (auth layer):** `src/lib/supabase/` clients, `src/proxy.ts` guard, `login/` + `auth/`
(actions + callback + allowlist), `supabase/migrations/0001_init.sql` (schema + RLS + seed),
`.env.local.example`, `SUPABASE_SETUP.md`. App defaults to demo mode until keys are set.
**Still not present:** a created Supabase project + `.env.local`, section reads/writes wired to the DB,
service worker, push subscription code.

---

## 5. Session Log

> Newest first. Each entry: date · what changed · what's next.

### 2026-07-23 — Supabase auth layer (code-complete, demo-mode default)
- Built the full Supabase integration: browser/server clients (`src/lib/supabase/`), Next 16 session
  `proxy.ts` with route protection, Google OAuth (`app/auth/actions.ts` + `auth/callback` with a
  single-email allowlist), a branded `/login` page, and sign-out in Settings.
- Wrote the DB schema + RLS + on-signup seed trigger (`supabase/migrations/0001_init.sql`),
  `.env.local.example`, and `SUPABASE_SETUP.md`.
- App still **defaults to demo mode** with no keys; verified `/`, `/settings`, `/login` render and
  `proxy.ts` no-ops in demo. `tsc --noEmit` clean. Also fixed a `motion` ease type, a Tailwind v4
  Lightning-CSS `backdrop-filter` strip (glass frosts now), and an extension hydration warning.
- **Next:** create the Supabase project → migrate Expenses to real data as the reference pattern,
  then the other sections, then Mood Mode palette + reminders + Higgsfield mascot art.

### 2026-07-23 — Baseline captured + git tracking added
- Established this status doc as the plan + progress tracker.
- **Initialized git** and made the baseline commit (`5e7345a`, 63 files; `node_modules` ignored) so future
  sessions can diff exactly what changed.
- No app code changed this session; recorded the current state as the baseline.
- **Where things stand:** full UI is built and animated on sample data; backend is untouched.
- **Suggested next:** stand up Supabase (project + client + `proxy.ts`), then Google auth + allowlist,
  then swap one section (Expenses is the planned first) from sample data to real persistence.
