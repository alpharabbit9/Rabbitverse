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

_Last updated: 2026-08-02_

---

## 1. Status at a glance

**Phase: Real data wired end-to-end.** Every section now **reads from Supabase and writes back** for the
signed-in user (RLS-scoped): Expenses (log form), Projects (create + log progress), Workout (mark
done/rest + weight), Mental Health (mood + journal), and the Overview aggregates all of it into real
Life-Score / trend / streak / heatmap. The profile now shows the **Google account picture**. The app
still **defaults to demo mode** (sample data) until `NEXT_PUBLIC_DEMO_MODE=false` + sign-in; both paths
share the same components via a server-page → client-view split (`*-view.tsx`), so demo and real render
identically. `tsc` + `eslint` clean; demo mode verified in-browser.

**Next milestone:** use it for a real week, then tackle remaining polish — a height input for BMI,
Mood Mode driven by real signals, then reminders (Web Push + cron) and Higgsfield mascot art.

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
- ✅ App shell — sidebar + mobile bottom-nav (now includes **Projects**), section routing, greeting; verified responsive 360→430px
- ✅ Theme system — dark default + light, theme toggle, design tokens
- ✅ PWA — manifest (`src/app/manifest.ts`) + **service worker** (`public/sw.js`: push + offline fallback), registered app-wide, `/offline` route
- ✅ Supabase client wiring — browser/server clients + `proxy.ts` session refresh; **live project connected, migrations `0001`+`0002` applied**
- 🟡 Google OAuth + single-email allowlist — `/login`, `app/auth/actions.ts`, `auth/callback` built against the live project; end-to-end sign-in still to be exercised
- ✅ Row-Level Security (RLS) — full schema + policies + on-signup seed trigger in `supabase/migrations/0001_init.sql`

### Phase 2 — Reusable primitives
- ✅ Chart wrappers — sparkline, trend (line/area), radar balance
- ✅ Progress ring + animated count-up
- ✅ Activity heatmap component
- ✅ SVG rabbit mascot component
- ✅ Logging-input pattern (today+yesterday window) — real Server Actions per section, window-validated

### Phase 3 — Sections (schema + inputs + graphs + heatmap each)
- ✅ Expenses — real reads + inline log form (`quick-add/actions.ts` `addExpense`)
- ✅ Projects — real reads + rich detail: goals/vision, **task checklist** (drives progress %), **dated written updates ("commits") = days worked**, start→finish dates. Detail route `/projects/[id]`. Needs migration `0002` applied.
- ✅ Workout — real reads + mark today done/rest + weight/body-fat logging + **height setter** (unlocks BMI) (per-exercise still Phase 1.5)
- ✅ Mental Health — real reads + mood(1–5) + journal upsert

### Phase 4 — All / Dashboard
- ✅ Combined cards + trend + radar + timeline + section cards — real aggregates via `lib/aggregate.ts` + `lib/data/queries.ts`
- ✅ Motivation engine (`src/lib/motivation.ts`) — rule-based headline + "rabbit says"

### Phase 5 — Mood Mode & mascot wiring
- ✅ Life-score / mood-state engine (`src/lib/life-score.ts`) — computes score & tone from signals (real in live mode)
- ✅ Mascot state derived from activity/streak
- ✅ Mood Mode aura (`components/mood-mode.tsx`) — now driven by real signals: `getMoodState` computes the week's `MoodState` and the `(app)` layout sets `<html data-mood>` app-wide (sample mood in demo)

### Phase 6 — Reminders
- 🟡 Web Push subscription storage — **code-complete**: client subscribe helpers (`src/lib/push.ts`), Settings → Reminders toggle + time picker (`components/settings/reminders-card.tsx`), server actions storing/removing subscriptions + saving reminder time (`settings/actions.ts`). Needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set.
- 🟡 Supabase `pg_cron` + Edge Function sending VAPID push — **code-complete**: Edge Function `supabase/functions/send-reminders/index.ts` + cron migration `0003_reminders.sql`. Needs VAPID keys generated, function secrets set, function deployed, and migration `0003` run (steps in `SUPABASE_SETUP.md` §6).

### Phase 1.5 (after v1)
- ⬜ Per-exercise logging (sets/reps/weight) + strength graphs
- ⬜ Seasonal accent themes
- ⬜ Data export (JSON/CSV)

### v2 (design-for, not building)
- ⬜ AI chatbot (type a sentence → update dashboards)
- ⬜ Weather integration · illustrated mascot · AI-written advice

---

## 4. Current-state snapshot (what exists in the code today)

**Each page is a server component that reads real Supabase rows when signed in, and falls back to
`src/lib/sample-data.ts` (a seeded PRNG) in demo mode — via the per-feature `lib/data/*` fetchers +
`lib/aggregate.ts` and per-section `*-view.tsx` client components + `actions.ts` Server Actions.**

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

### 2026-08-02 — Data layer split per feature
- Broke the single `lib/data/queries.ts` (~480 lines) into per-feature modules under `lib/data/`:
  `expenses.ts`, `projects.ts` (list + detail), `workout.ts`, `mental.ts`, `overview.ts`
  (overview + `getMoodState` + timeline helper), and `profile.ts`. Shared constants
  (`WEEKLY_BUDGET`, `HEATMAP_DAYS`) and the row→domain shapers moved to `lib/data/shared.ts`.
- Updated all 8 import sites; deleted `queries.ts`. Pure refactor, no behavior change. `tsc --noEmit` clean.
- Rationale: `queries.ts` was the file most likely to become a dump; splitting it keeps each feature's
  read path in one place. Deferred a fuller modular restructure — not worth it at this scale.

### 2026-08-02 — Reminders (code-complete) · service worker/PWA · mobile Projects tab · responsiveness verified
- **Data layer refactor (from a parallel session, now integrated):** `lib/data/queries.ts` was split
  into per-feature modules (`overview.ts`, `profile.ts`, `expenses.ts`, `projects.ts`, `workout.ts`,
  `mental.ts`, `shared.ts`); pages import from those. `getMoodState` now lives in `overview.ts`.
- **Service worker + PWA (Phase 1 closed):** `public/sw.js` handles Web Push (`push` +
  `notificationclick`) and a network-first navigation fallback to a new `/offline` route; registered
  app-wide via `components/pwa/service-worker-register.tsx`. `/offline` added to the proxy allowlist.
- **Reminders (Phase 6, code-complete — needs deploy):** client subscribe/unsubscribe helpers
  (`lib/push.ts`), a Settings → Reminders card with an on/off push toggle + Dhaka-local time picker,
  server actions (`settings/actions.ts`: `savePushSubscription` / `deletePushSubscription` /
  `saveReminderTime`), a Deno Edge Function `send-reminders` that pushes to due users each minute, and
  cron migration `0003_reminders.sql`. Deploy steps in `SUPABASE_SETUP.md` §6; `.env.local.example`
  gains `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. `supabase/functions` excluded from `tsc`/eslint.
- **Mobile nav:** added the **Projects** tab (5 tabs + center +); fits to 360px.
- **Responsiveness:** verified in-browser (forced demo mode) at 360 / 375 / 430px across all routes —
  zero horizontal overflow; heatmap scrolls within its own container.
- `tsc --noEmit` clean; eslint has 2 **pre-existing** `set-state-in-effect` errors in untouched files
  (`theme-toggle.tsx`, `count-up.tsx`) — no new lint errors from this work.
- **Next:** generate VAPID keys + deploy the reminders function/cron, then exercise Google sign-in
  end-to-end. That closes v1.

### 2026-07-31 — Live DB confirmed · height input · Mood Mode wired to real signals
- **Supabase is live:** the real project is connected with migrations `0001`+`0002` already applied,
  so the app runs on real data when signed in. Updated the roadmap ticks accordingly.
- **Height input (BMI):** `profiles.height_cm` had no way to be set, so BMI was stuck at "—". Added a
  `saveHeight` Server Action (`workout/actions.ts`, validates 50–260 cm, updates `profiles`) and a
  `HeightForm` shown in the Workout "Body stats" panel next to weight (prefilled/Update when set).
- **Mood Mode → real signals (Phase 5 closed):** `getMoodState(today)` (`lib/data/queries.ts`) computes
  the week's `MoodState` from the same signal blend as the overview. `MoodMode` now takes the mood as a
  prop; moved its render from the root layout into the `(app)` layout so the `<html data-mood>` aura
  reflects real signals on every app page (sample mood in demo, neutral glow on `/login`).
- `tsc --noEmit` + `eslint` clean. Signed-in UI (height form, live aura) not browser-verified this
  session — needs an authenticated session + the port a concurrent dev server was holding.
- **Next:** exercise Google sign-in end-to-end, then the last V1 feature — reminders (service worker +
  Web Push subscribe + `pg_cron`/Edge Function). PWA service worker is still the remaining gap.

### 2026-07-30 — Projects: goals, task checklist, and dated update-commits
- **New migration `supabase/migrations/0002_project_details.sql` (additive, idempotent):** adds a
  `goals` text column to `projects` and a new `project_tasks` checklist table (owner-scoped RLS,
  matching every other table). `project_logs` is left one-row-per-day on purpose — each written
  update upserts that day's row, so **row count == distinct days worked**. ⚠️ Must be run against the
  live Supabase before the feature works in live mode.
- **Model (no conflicts):** task completion writes back into `projects.current_value` as a 0–100%
  value (`recomputeProgress`), so the ring and every downstream signal (life-score `productivity`,
  Goals view) keep reading `current/targetValue` unchanged. Projects with no checklist keep their
  numeric target. `createProject` now takes optional `goals` + aimed-finish-date and no longer
  requires a numeric target; the Quick-Add "New goal" numeric path is preserved.
- **New Server Actions** (`projects/actions.ts`): `addTask` / `toggleTask` / `deleteTask` (each
  recomputes %), and `addCommit` (dated update; appends within a day). All revalidate `/projects`,
  `/projects/[id]`, and `/`.
- **Read layer:** `getProjectsData` now attaches each project's `tasks` + `daysWorked`; new
  `getProjectDetail(id, today)` returns the project with checklist, commits, and its own heatmap.
- **UI:** `/projects` cards are now links (task-based ring + "N days logged"); new detail route
  `projects/[id]/page.tsx` → `project-detail-view.tsx` shows goals, dates with a day counter,
  stats (days worked / updates / tasks done), the checklist (`TaskRow`/`TaskAdder`), and a dated
  update timeline (`CommitComposer`). Read-only in demo; editable when signed in.
- **Demo:** `sampleProjectDetail()` synthesizes a deterministic checklist + commits so the detail
  page is alive on sample data. `tsc --noEmit` + `eslint` clean; verified the demo list, detail,
  checklist, commits, dates, ring, read-only rows, and the unknown-id 404 render server-side.
- **Next:** apply migration `0002` to Supabase, then create a real project and log a few days.

### 2026-07-28 — Real data wired across all sections + Google profile picture
- Added a shared read/aggregate layer: `src/lib/aggregate.ts` (pure: activity build, streak, signals,
  30-day life-score trend, progression) and `src/lib/data/queries.ts` (server-only Supabase fetchers that
  shape rows into the existing domain types, so components are mode-agnostic).
- Refactored every dashboard into a **server page → client `*-view.tsx`** pair. In demo mode the page
  feeds sample arrays; when signed in it feeds real Supabase rows — identical UI either way.
- **Write path (Server Actions):** Expenses log (existing `addExpense`), Projects `createProject` +
  `logProgress` (bumps `current_value`, records `project_logs` for the heatmap), Workout
  `setTodayWorkout` (done/rest upsert) + `logWeight` (body_metrics upsert), Mental `saveJournal`
  (mood + text upsert). All validate the today/yesterday window and revalidate paths.
- **Overview** now computes real Life Score, trend, streak, mood, balance, timeline, and rabbit state
  from the live rows via the aggregate layer.
- **Profile:** new `components/layout/profile-avatar.tsx` shows the signed-in Google account picture
  (`user_metadata.avatar_url`/`picture`) in the sidebar chip + Settings, with a gradient-monogram
  fallback (used in demo / on load error). Settings is now a server component showing name + email.
- Dropped the `server-only` import (not installed) — queries are only imported by server files anyway.
  `tsc --noEmit` and `eslint` clean; verified Overview/Expenses/Settings/Projects/Mental render in demo.
- **Known gaps:** BMI needs a height input (shows "—" until set); Mood Mode aura still cosmetic/sample.
- **Next:** flip `NEXT_PUBLIC_DEMO_MODE=false`, log a real week, then height input + real Mood Mode +
  reminders (Web Push + `pg_cron`) + Higgsfield mascot art.

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
