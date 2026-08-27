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

_Last updated: 2026-08-28_

> **V2 has begun.** V1 is finished; V2.0 ("Tell Rabbit what you did; Rabbit tells you when
> you're off-track") is a two-pillar build in **7 phases** — full spec in the plan file
> `C:\Users\User\.claude\plans\if-v1-is-finished-whimsical-quail.md`. See the **V2.0 roadmap**
> section below for phase-by-phase progress.

---

## 1. Status at a glance

**Phase: V2.0 shipped — both pillars live.** You can now **type one sentence** into the AI box on Quick-Add
("spent ৳450 on lunch, did legs, feeling good 4/5") and Rabbit parses it into reviewable chips that save
through the existing section actions; and you can **set targets** in Settings (monthly/weekly ৳ caps, workouts
and check-ins per week) that Rabbit checks continuously — warnings surface on each section, on the project
that is overdue or behind pace, and in a "Needs attention" strip on the Overview, with being off-track gently
holding back the Mood Mode tone and the mascot. The one thing still unexercised is a **signed-in live pass**
(see the two session-log entries below).

**Previously (V1): Real data wired end-to-end.** Every section now **reads from Supabase and writes back** for the
signed-in user (RLS-scoped): Expenses (log form), Projects (create + log progress), Workout (mark
done/rest + weight), Mental Health (mood + journal), and the Overview aggregates all of it into real
Life-Score / trend / streak / heatmap. The profile now shows the **Google account picture**. The app
still **defaults to demo mode** (sample data) until `NEXT_PUBLIC_DEMO_MODE=false` + sign-in; both paths
share the same components via a server-page → client-view split (`*-view.tsx`), so demo and real render
identically. `tsc` + `eslint` clean; demo mode verified in-browser.

**Post-V2 audit (2026-08-26, later):** every roadmap phase is complete as claimed; what's left is
infrastructure, not code (reminders deploy + the signed-in pass). Four bugs found and fixed on the way —
a workout logged "yesterday" was written to today, a review chip's headline went stale when edited,
numeric progress on a checklist project moved the ring and then snapped back, and the Settings target
toggle restored the minimum instead of the default. eslint is now clean too. See the top session-log entry.

**Next milestone: V3.0** — multi-user, a user-chosen mascot, voice input, guardrails, and editable
logs. Planned in full in **`updatePlan.md`** (repo root); **Phases A–F are shipped** — the app takes
self-serve signups, gives every user their own timezone and currency, lets them pick which of **six
creatures** shows up, transcribes voice into the AI box, protects the shared Groq key with per-user
rate limits + a circuit breaker + save-idempotency (**Redis, fail-open**), and now lets you **edit or
delete** any expense, reflection, project update, or whole project. **Phase G (depth, performance,
resilience, user-owned config) is next.** Still outstanding: the **signed-in live pass** (now also
covering edit/delete round-trips, two-account RLS isolation, signup atomicity, the mascot picker and
voice on-device), Upstash key provisioning, the reminders Edge Function + cron deploy, and Higgsfield
mascot art.

Legend: ✅ done · 🟡 partial / UI-only (no real data) · ⬜ not started

---

## 2. The plan (one-screen summary)

**Rabbit Verse** is a **multi-user life-tracking PWA** (single-user until V3.0 Phase B). It turns four life areas —
**Projects, Workout, Expenses, Mental Health** — into visible weekly/monthly/yearly trends, a
GitHub-style activity **heatmap**, and a combined **"All"** dashboard with rule-based encouragement.
Dark by default, calm and premium, with a code-drawn **SVG rabbit mascot** that reacts to progress.

- **Who:** anyone with an account — email + password or Google. Every row is scoped to its owner by
  RLS; `public.users.status` can suspend one. (Was: Rifat only, behind a single-email allowlist.)
- **Stack:** Next.js 16.2 (App Router, Turbopack) + React 19.2 · Tailwind v4 + shadcn/ui · `motion` v12 ·
  Recharts 3.10 · Supabase (Postgres + Google auth + `@supabase/ssr`, Next 16 uses `proxy.ts`). Free tiers.
- **Rules:** all "today/yesterday", streaks, and heatmap buckets computed in **each user's own
  timezone** (default Asia/Dhaka). Backfill window = **today + yesterday only**, then locked.
  Currency is **per-user** (default ৳ BDT). English only.
- **Later:** Phase 1.5 = per-exercise logging, seasonal themes, data export. v2 = AI "type-what-I-did"
  chatbot, weather, illustrated mascot.

---

## 3. Roadmap & progress

### Phase 1 — Foundation
- ✅ App shell — sidebar + mobile bottom-nav (now includes **Projects**), section routing, greeting; verified responsive 360→430px
- ✅ Theme system — dark default + light, theme toggle, design tokens
- ✅ PWA — manifest (`src/app/manifest.ts`) + **service worker** (`public/sw.js`: push + offline fallback), registered app-wide, `/offline` route
- ✅ Supabase client wiring — browser/server clients + `proxy.ts` session refresh; **live project connected, migrations `0001`+`0002` applied**
- 🟡 Auth — Google OAuth **+ email/password signup** (`/login`, `/signup`, `/forgot-password`, `/auth/reset`, `/suspended`); the single-email allowlist was removed in V3.0 Phase B in favour of `public.users.status`. End-to-end sign-in still to be exercised
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

### V2.0 — two pillars, 7 phases ✅ **complete**
> Plan: `C:\Users\User\.claude\plans\if-v1-is-finished-whimsical-quail.md`. Pillar 1 = AI logging
> (phases 1–3), Pillar 2 = targets & warnings (phases 4–6), phase 7 = integration/polish.
- ✅ **Phase 1 — AI foundations & pure parse layer**: `groq-sdk`+`zod`+`vitest` added; `GROQ_API_KEY` documented; `src/lib/ai/groq.ts` (server-only client) + `src/lib/ai/parse-log.ts` (intent contract, zod schema, prompt, pure intent→action mapping) + 13 passing unit tests.
- ✅ **Phase 2 — `parseLog` Server Action**: `quick-add/ai-actions.ts` calls Groq in JSON mode with the Phase-1 prompt + server-built context, zod-validates the reply, and returns dispatch descriptors. Never throws — bad key/network/JSON all come back as `{ ok:false, error }`. Offline `demoParse` fallback when signed out or key-less. **Model swapped** to `openai/gpt-oss-120b` (Groq retired `llama-3.3-70b-versatile`).
- ✅ **Phase 3 — AI Log Box UI → review → save**: `components/quick-add/ai-log-box.tsx` (hero input → editable/removable chips → one Save) mounted above the manual tabs; `saveIntents` fans out to the existing V1 actions server-side. **Pillar 1 shipped** (live DB write still needs a signed-in pass — see session log).
- ✅ **Phase 4 — Targets storage & Settings UI**: `lib/targets.ts` (the `Targets` shape, `DEFAULT_TARGETS`,
  `TARGET_LIMITS`, `coerceTarget`/`parseTargets`) + `saveTargets` writing `profiles.settings.targets` (no migration)
  + `components/settings/targets-card.tsx` mounted in Settings + the weekly cap now feeding the Life-Score money
  signal via `lib/data/targets.ts` (`WEEKLY_BUDGET` demoted to the fallback).
- ✅ **Phase 5 — Warning logic & component**: `computeTargetStatuses` (monthly/weekly caps on Dhaka boundaries,
  weekly workout & check-in pace, project overdue + behind-pace) → `TargetStatus[]`, plus `attentionStatuses`/
  `sectionStatuses`/`worstLevel` selectors and `components/dashboard/target-warning.tsx`
  (`TargetBadge`/`TargetWarning`/`TargetWarnings`). 24 new unit tests.
- ✅ **Phase 6 — Warnings wired into every section + Overview**: each section page fetches `getTargets()` and
  renders `TargetWarnings` under its header (via `sectionTargetStatuses`, which blanks the targets a section
  cannot judge from its own rows); `/projects` cards carry an Overdue/Behind-pace `TargetBadge` and the detail
  route gets its own banner; the Overview gains a **"Needs attention"** strip and per-section-card badges.
  **Pillar 2 shipped.**
- ✅ **Phase 7 — Integration, polish & docs**: target status now nudges the Mood Mode tone (`moodState`) and the
  mascot (`rabbitStateFor`) — cap-never-lift; **"this week"/"this month" reconciled to real Dhaka boundaries**
  everywhere the user is shown one (see the session log — this fixed cards that contradicted the new banners);
  sample projects given finish dates so demo exercises the warnings. **V2.0 complete.**

### V3.0 — "Many Rabbits" (A–G)
> Plan: [`updatePlan.md`](updatePlan.md) (repo root). A/B/C/D shipped; E–G still open.
- ✅ **A — Correctness fixes**: `lib/health.ts` BMI bands, workout caption from `targets.weeklyWorkouts`,
  dated weight/commit/progress logging, `hasData`-gated trend copy, 30-day average mood.
- ✅ **B — Multi-user foundation**: migration `0004_multi_user.sql` (`public.users` roster +
  `profiles`→`user_profiles` + a transactional `handle_new_user()`), email/password signup and reset,
  `ALLOWED_EMAIL` deleted in favour of `users.status`, `lib/session.ts` + per-user timezone & currency.
- ✅ **C — Mascot system**: `components/mascot/` is a registry — `shell.tsx` owns the aura, the four
  motion presets and the state→eye-colour map; six code-drawn species (Rabbit, Fox, Wolf, Owl, Cat,
  Dragon) supply only the body; `MascotProvider` seeds the choice from `getSession()`; Settings gains
  a six-tile picker saved by `saveMascot`.
- ✅ **D — Voice input**: mic button beside "Log it" → record (live waveform + timer + 60 s cap) →
  `transcribe` Server Action over Groq Whisper (`whisper-large-v3-turbo`) → the transcript lands in the
  textarea, editable and never auto-parsed. Recorder logic in `lib/use-voice-recorder.ts`, bars in
  `components/quick-add/waveform.tsx`. No key → button hidden; demo → "Sign in to use voice input."
- ✅ **E — Redis guardrails**: `lib/redis.ts` (Upstash over REST, no-ops when unconfigured) now
  wired into `ai-actions.ts` — per-user sliding-window limits on `parseLog` (20/hr) and `transcribe`
  (30/day), a global daily circuit breaker on the shared Groq key, and an idempotency key on
  `saveIntents`. Every guardrail **fails open**, so behaviour is identical until Upstash keys are set.
- ✅ **F — Edit & delete**: `updateExpense`/`deleteExpense`, `updateJournalEntry`/`deleteJournalEntry`,
  `updateCommit`/`deleteCommit`/`renameProject`/`deleteProject` — all in the existing guard shape,
  RLS-scoped by row id. A tap-first ⋯ `RowMenu` on the recent-expenses list, journal list and commit
  timeline (Edit inline via the existing forms in an edit mode; Delete optimistic + **undoable**), plus
  project rename/delete on the detail header. Editing an old row is allowed on purpose — no logging
  window. Migration `0005_editable_logs.sql` is a documented safety-net (0001's `for all` RLS +
  cascade FKs already covered it).
- ⬜ **G — Depth, performance, resilience, user-owned config**

### Beyond V2.0 (design-for, not building)
- ⬜ 2.1 — AI reflections & advice (weekly summary over aggregates + target statuses)
- ⬜ 2.2 — Income & savings (new domain + savings-goal target + new parser intents)
- ⬜ Weather integration · illustrated mascot

---

## 4. Current-state snapshot (what exists in the code today)

**Each page is a server component that reads real Supabase rows when signed in, and falls back to
`src/lib/sample-data.ts` (a seeded PRNG) in demo mode — via the per-feature `lib/data/*` fetchers +
`lib/aggregate.ts` and per-section `*-view.tsx` client components + `actions.ts` Server Actions.**

- **App shell:** `src/app/(app)/layout.tsx`, `components/layout/sidebar.tsx`, `mobile-nav.tsx`
- **Pages:** All/overview `(app)/page.tsx`; `projects`, `workout`, `expenses`, `mental-health`,
  `settings`, `quick-add` — all under `src/app/(app)/`
- **Dashboard pieces:** `components/dashboard/` — stat-card, section-card, panel, page-header,
  activity-heatmap, today-timeline, mascot-says, ai-insight
- **Charts:** `components/charts/` — sparkline, trend-chart, radar-balance; `components/ui/` — ring, count-up
- **Mascot:** `components/mascot/` — `types.ts` (states, species, copy, `resolveMascot`),
  `shell.tsx` (aura, motion, eye colour), six species files, `registry.ts`, `provider.tsx`
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

### 2026-08-28 (latest) — V3.0 Phase E wired + Phase F shipped: guardrails & editable logs

Two phases closed in one pass. First, a **check of A–E turned up one genuine gap**: Phase E's
`lib/redis.ts` + tests existed (from the Phase D session) but were **never wired in** — `ai-actions.ts`
didn't import them and `transcribe` still carried a `TODO(Phase E)`. So E was *finished*, not restarted.

- **Phase E — guardrails now live in the code path.** `parseLog` gates on `parseLogLimit` (20/hr/user)
  + `groqDailyBudget(1)`; `transcribe` on `transcribeLimit` (30/day/user) + `groqDailyBudget(3)` (audio
  is the dear path — heavier circuit-breaker cost); `saveIntents(dispatches, idempotencyKey?)` claims a
  one-shot key via `claimOnce`. The client (`ai-log-box.tsx`) mints a **fresh key per Save click**, so a
  deliberate retry after a partial failure still goes through and only a duplicate dispatch of one click
  is de-duped — a duplicate returns a clean no-op (the first call already wrote + revalidated). Every
  guardrail **fails open** when Upstash is unconfigured, so this is safe to ship *before* the keys are
  provisioned; local/demo behaviour is byte-identical to before.
- **Phase F — everything you log is now editable and deletable.** New actions in the existing
  `requireUser → validate → revalidatePath` shape, each scoped by RLS on the row id (the client sends
  only the id + the change): `updateExpense`/`deleteExpense` (new `expenses/actions.ts`),
  `updateJournalEntry`/`deleteJournalEntry`, and `updateCommit`/`deleteCommit`/`renameProject`/
  `deleteProject`. `deleteProject` redirects to `/projects`; its updates + checklist cascade at the DB.
- **UI: a tap-first ⋯ menu, inline edit, undoable delete.** `components/ui/row-menu.tsx` (Edit +
  a second rose "Confirm delete" tap — no hover-only affordances, since this is a phone) and
  `components/ui/use-undoable-delete.ts` (optimistic hide + a sonner **Undo** toast; the server delete
  only fires once the Undo window lapses, so there's nothing to restore and no log-window to fight).
  Wired into the recent-expenses list (`expenses/recent-expenses.tsx`), the journal list
  (`mental-health/recent-journal.tsx`) and the commit timeline (`CommitTimeline` in `project-forms.tsx`).
  Edit reuses the existing **`ExpenseForm`/`JournalForm`** in a new `mode="edit"`, and project
  rename/delete sits in a `ProjectSettings` ⋯ on the detail header.
- **Editing an old row is allowed on purpose** — new pure helper `lib/edit.ts::isEditableDate` gives edit
  *no* lower date bound (only "not the future"), the opposite of the today/yesterday logging fence, with a
  code comment so a later session doesn't "fix" it back. 8 tests.
- **⚠️ Plan correction — the F migration is a documented no-op.** The plan called for *additive*
  update/delete RLS policies. Verified against 0001: the policy is `for all using (auth.uid() = user_id)`
  — one policy already covering UPDATE + DELETE — and `project_logs`/`project_tasks` already
  `cascade on delete` from `projects`. So `0005_editable_logs.sql` adds nothing the app needs; it holds
  the reserved number and **idempotently re-asserts** the owner policy + cascades so a fresh DB is
  guaranteed editable.
- **Verified:** `tsc --noEmit` clean · `eslint` **0 problems** · `next build` clean · `vitest` **110/110**
  (+ `edit.test.ts`). In the demo server (:3100) `/mental-health`, `/projects/[id]` and `/expenses`
  render with **zero console errors**, and the read-only lists (no ⋯ menus when signed out) are intact —
  the extracted client components hydrate cleanly.
- **Not verified (needs a signed-in pass, can't be done in demo):** the edit/delete round-trips
  themselves — the ⋯ menus, inline edit forms, undoable delete and project rename/delete all render only
  when `canLog`/live. This joins the standing signed-in pass. Also unchanged: Upstash key provisioning
  (until then the guardrails no-op), and the reminders deploy.
- **Next:** **Phase G** — expense history panel, a shared range toggle, `React.cache()` fan-out cuts,
  `loading.tsx`/`error.tsx`/`not-found.tsx`, a categories editor, a workout-plan editor, and data export.

### 2026-08-28 — V3.0 Phase D shipped: voice input

You can now talk to the AI box instead of typing it.

- **Mic beside "Log it".** `ai-log-box.tsx` gains a `voiceReady`-gated mic button (hidden when the Groq
  key is absent). Tap it and the parse row swaps for a recording panel: a pulsing red dot, a live
  waveform, and a `m:ss / 1:00` timer. Tap "Stop & transcribe" (or hit the 60 s cap, or "Cancel"). The
  finished clip goes to Whisper and the text lands **in the textarea, editable, and never auto-parsed** —
  the same review-before-commit rule the whole box follows. It **appends** to whatever's already typed,
  so a half-written sentence isn't clobbered.
- **The recorder is a hook, not inline.** `lib/use-voice-recorder.ts` owns the MediaRecorder +
  AnalyserNode + timer + 60 s auto-stop and emits a Blob; `components/quick-add/waveform.tsx` paints the
  bars off the analyser (theme-aware, reads `--accent-purple`/`--accent-cyan`). `supported` is read with
  `useSyncExternalStore` (server snapshot `false`) so the button is client-only with no hydration
  mismatch — and no setState-in-effect (eslint `react-hooks` is strict about both). Mic released on
  unmount, stop, and cancel.
- **`transcribe` Server Action** (`quick-add/ai-actions.ts`) → `groq.audio.transcriptions.create` with
  `whisper-large-v3-turbo` (added beside `GROQ_MODEL` in `groq.ts`). Never throws: a blocked mic, a
  missing key, an unreachable model, or a signed-out caller all come back as `{ ok:false, error }` → a
  toast, not a crash. **No demo fallback** — Whisper can't be faked offline, so signed-out/unconfigured
  gets a clear nudge. Server-side guards: live session, `isGroqConfigured()`, a non-empty clip, a 25 MB
  cap; `audio/webm;codecs=opus` with an `audio/mp4` fallback for Safari, re-wrapped via `toFile` so Groq
  reads the format from a real extension.
- **Whisper chosen over the Web Speech API on purpose** — this app is an installed iOS PWA, where
  `SpeechRecognition` is unreliable, and Whisper handles ৳/taka and mixed Bangla-English far better.
- **Verified:** `tsc`, `eslint`, `next build` all clean; `vitest` 95/95 (added `audioFileName` mapping
  tests). In the demo server the mic button renders beside "Log it" and clicking it nudges "Sign in to
  use voice input." with zero console errors. **Still needs a signed-in/device pass** (the plan scopes it
  that way): record on the installed iOS PWA and confirm the transcript lands editable and un-parsed —
  the preview browser has no microphone.
- **Rate-limiting is deferred to E, as designed.** `transcribe` carries a `TODO(Phase E)` where the
  Upstash per-user daily limit + global circuit breaker will wrap the call before public signup — audio
  is the costly path.
- **Next:** **E — Redis guardrails** (`lib/redis.ts` no-op when unconfigured; rate limits on `parseLog`
  + `transcribe`, a global Groq circuit breaker, idempotency on `saveIntents`). Must land before public
  signup goes live.

### 2026-08-26 — V3.0 Phase C shipped: the mascot system

The rabbit is now one of six, and which one you get is yours to choose.

- **Shell / species split.** `mascot/shell.tsx` owns everything that is not the animal — the glow
  aura, the four motion presets, the charge streaks, the sleep drift, the victory shards and the
  state→eye-colour map — and hands each body `{ state, eyeColor, sleeping, running, celebrating }`
  through a render prop. A species file is now a `<defs>` and a handful of polygons on the same
  120×120 grid, so all six move identically and only the drawing differs. A `Crest` wrapper carries
  ears/horns/tufts, so every headpiece shakes on the same victory beat around the same pivot.
- **Six creatures, code-drawn, no asset pipeline.** **Rabbit** (art unchanged, now rendered through
  the shell), **Fox**, **Wolf**, **Owl**, **Cat**, **Dragon** — one angular warrior crest, six
  palettes, all cut from the Rabbit's head/muzzle/collar geometry so they read as one family.
- **`types.ts` holds no React on purpose.** `MascotState`, `MascotSpecies`, `MASCOT_NAMES`,
  per-species `MASCOT_COPY` and `resolveMascot()` live there because `lib/session.ts` and the
  `saveMascot` action validate a species string **on the server**, and dragging six client
  components into those module graphs to do it would be silly. `registry.ts` is where species meet
  drawings (`MASCOTS: Record<MascotSpecies, {name, Component, copy}>`) and re-exports `resolveMascot`,
  so the plan's import path works either way.
- **Wiring is by context, not props.** A layout cannot hand props to the page beneath it, and both
  render sites sit several levels inside their pages — so `(app)/layout.tsx` seeds a `MascotProvider`
  from `getSession()` (the rabbit in demo mode) and `page-header.tsx` / `mascot-says.tsx` call
  `useMascot()`. Exactly the shape Phase B's `LocaleProvider` established.
- **Renames** (mechanical, type-checked): `RabbitState`→`MascotState`, `rabbitStateFor`→`mascotStateFor`,
  `rabbitSays`→`mascotSays`, and `RabbitSays`→**`MascotSays`** in `dashboard/mascot-says.tsx`, whose
  heading now renders `{name} says` — "Dragon says" if that is what you picked. The `rabbitState`
  prop/field is `mascotState` everywhere.
- **Settings → Mascot.** Six tiles, each drawing its own creature live in the `walking` pose so the
  choice is made on the animation rather than a still. Saves on tap through `saveMascot` (same
  `requireUser` → validate → `revalidatePath` shape as `saveTargets`) and rolls the selection back if
  the write fails. It revalidates *every* route under the (app) layout, because that is where the
  provider is seeded. Demo mode shows a sign-in note and keeps the rabbit.
- **Fixed on the way:** the sleeping "z" bubbles animated the **`cy` attribute**, and motion hands SVG
  geometry attributes to the DOM verbatim — the first keyframe arrived `undefined`, so the browser
  logged `<circle> attribute cy: Expected length, "undefined"` for every sleeping mascot on screen.
  They now rise on `y` (a transform, which motion routes through `style.transform` for SVG children).
  Identical motion, quiet console. The bug was pre-existing in `rabbit.tsx` and inherited by the shell.
- **`logo-mark.png` untouched** — that is brand, not mascot. The layer is deliberately brand-agnostic
  so the rebrand Rifat is working on drops straight in.
- **Verified:** `tsc --noEmit` and `eslint` clean, 92 tests still pass. All six species were rasterized
  at 4 states against both a dark and a light ground and eyeballed — the **Owl** was redrawn after
  that pass (it read as a cat; it now has a heart-shaped facial disc, big ringed eyes and short blunt
  tufts), the **Dragon's** horns were re-rooted onto the skull instead of floating above it, and the
  **Cat's** ears were lowered and widened so its silhouette cannot be mistaken for the Rabbit's. The
  three wired components (header, says-card, picker) were mounted in the real Next dev server and
  render with no console errors.
- **Not verified:** the Settings panel and the header *in situ* on a signed-in session. The picker is
  signed-in-only, and a second dev server cannot run while the existing one holds `.next` — so this
  joins the outstanding signed-in pass. Screenshots were unavailable in this session, hence the
  offline rasterising.
- **Next:** Phase D (voice input) — independent of everything shipped so far.

### 2026-08-26 — V3.0 Phase B shipped: multi-user foundation

Rabbit Verse is no longer single-user. Anyone can create an account, and every user brings their
own timezone and currency. Data isolation already worked (0001's RLS is `auth.uid() = user_id` on
all ten tables) — what changed is everything that assumed *one particular* user.

- **Migration `0004_multi_user.sql`** (idempotent, safe to re-run):
  - **`public.users`** — the roster `auth.users` can't be under the anon key: `email citext`,
    `status ('active'|'suspended')`, `role`, backfilled from `auth.users`. RLS is **select-own and
    nothing else**, so `status` is service-role-only — a suspended user cannot un-suspend themselves.
  - **`profiles` → `user_profiles`** by *rename*, so existing rows, the PK, every FK and the
    "own profile" policy survive. Gains `avatar_url`, `mascot`, `timezone`, `currency`, `locale`
    (with shape check constraints; the real IANA/ISO validation is server-side).
  - **`handle_new_user()` rewritten.** It's an `after insert on auth.users` trigger, so it already
    runs *inside* the signup transaction: the roster row and profile inserts hard-fail, rolling the
    account back rather than leaving an orphan. The category/plan **seeds** sit in their own
    `exception when others then null` block — a seed hiccup must never cost somebody their account.
    `seedProfileDefaults()` backfills that case. The `'Rifat'` fallback is now the email local-part.
- **Accounts (B2).** Email + password signup alongside Google: `/signup`, password fields on
  `/login`, `/forgot-password`, `/auth/reset`, `/suspended`. New `auth/actions.ts` — `signUpWithPassword`,
  `signInWithPassword`, `requestPasswordReset`, `updatePassword` — with Supabase's developer-facing
  errors mapped to calm copy, and **no account-enumeration oracle** (signup and reset give the same
  reply whether or not the address exists). Auth chrome extracted to `components/auth/auth-shell.tsx`
  so all five screens are one product.
- **`ALLOWED_EMAIL` is deleted.** The gate is now `public.users.status`, enforced at the three
  points where entry actually happens: password sign-in, `/auth/callback`, and `(app)/layout.tsx`
  (which catches a mid-session suspension). Deliberately **not** in `proxy.ts` — that would cost a
  DB round-trip on every request. The callback also validates its `next` param as a same-origin
  path, so the reset link can't become an open redirect.
- **Demo mode is now local-dev-only.** With signup open, a deployed instance must send a signed-out
  visitor to `/login`, never to Rifat-shaped sample data. `NEXT_PUBLIC_DEMO_MODE` is honoured only
  outside production; in production the sole trigger is having no Supabase keys.
- **Per-user timezone (B3).** `lib/dates.ts`: `TZ` → `DEFAULT_TZ`, `dhakaToday` → `todayIn(tz)`,
  `dhakaHour` → `hourIn(tz)`, plus `isWithinLogWindow(iso, tz)` and `greeting(tz)`. **The pure day
  helpers were left alone** — they operate on ISO strings and were already timezone-free. New
  **`lib/session.ts`** wraps `getSession` / `getLocaleContext` / `currentDay()` in `React.cache()`,
  so the profile is read **once per request** instead of `getTargets()` re-querying 2–3× per route.
  Every page and action now takes "today" from `currentDay()`. Changing timezone does **not** rewrite
  history — stored dates are committed ISO days; the new zone applies going forward, and the
  Settings copy says so.
- **Per-user currency.** `taka()` is gone; new `lib/money.ts` formats through `Intl.NumberFormat`
  with `currencyDisplay: "narrowSymbol"` (which is what keeps BDT as ৳). `LocaleProvider` +
  `useMoney()` / `useCurrencySymbol()` seed the client tree from the layout, so ~15 literal ৳ across
  expenses, quick-add, targets, the AI box and the overview follow the profile. `targets.ts` and
  `motivation.ts` take the currency as a parameter (defaulting to BDT/en, so the existing tests hold).
- **Settings → Preferences** is now a real `LocaleCard`: full IANA timezone list via
  `Intl.supportedValuesOf` with the likely zones lifted to the top, plus a currency shortlist. Both
  save on change and roll back on failure.
- **The AI parser is locale-aware.** The prompt is told the user's currency and zone instead of
  hardcoding Taka; `demoParse`'s money regex is built from their symbol/code/words ("$12",
  "12 dollars"), not `৳|tk|taka`.
- **Reminders** compare against each user's own zone. The old fixed `+6` offset also couldn't handle
  DST; `localHHMM(tz)` via Intl can. The minute filter moved out of the query (the answer to
  "is it 21:00?" now differs per user) and into memory, over only profiles that have a reminder set.
- **Verified:** `tsc --noEmit`, `eslint` and `next build` all clean; `npm test` **73 → 92** with new
  `dates.test.ts` (zone rollover, DST spring-forward, the log window shifting per user) and
  `money.test.ts` (currencies, locales, compact, and junk-input fallbacks). Added `vitest.config.ts`
  so tests resolve the `@/*` alias — that gap was forcing libs into relative imports.
  In-browser: the demo dashboards, Expenses and Settings still render; `/login`, `/signup`,
  `/forgot-password`, `/suspended` and `/auth/reset` all render against a production build with no
  console errors, and `/signup` has no horizontal overflow at 375px.
- **Still outstanding (needs a signed-in pass, can't be done in demo):** two accounts proving RLS
  isolation, signup atomicity (force the trigger to raise → no orphan `auth.users` row; force only
  the seed block → account still usable), a profile on `America/New_York` rolling over at NY
  midnight, and USD flowing through every amount. Also unchanged: the reminders deploy (VAPID keys
  + Edge Function) and the V2.0 signed-in pass.
- **Next:** Phase C (mascot system) — `updatePlan.md` has it, and it's independent of B.

### 2026-08-26 — V3.0 planned · Phase A shipped (correctness)

- **V3.0 planned end to end.** Rifat asked what could be improved, then added three product
  changes: **multi-user**, a **user-chosen mascot**, and **voice input** in the AI box. Full spec
  in **`updatePlan.md`** (repo root, also at `…/plans/are-any-improvemnebt-in-whimsical-rabbit.md`).
  Seven phases, A–G. Decisions taken: users create their own accounts (a `public.users` roster +
  `public.user_profiles`, written **transactionally** by the existing signup trigger); **per-user
  timezone *and* currency**; the mascot layer built **brand-agnostic** (Rifat is reworking the
  title/logo separately); voice via **Groq Whisper**, not the Web Speech API, because the app is
  used as an installed iOS PWA where `SpeechRecognition` is unreliable.
- **Two framing findings from the audit.** Multi-user is *not* a data-model rewrite — RLS is
  already `auth.uid() = user_id` on all ten tables and the signup trigger already seeds per-user
  categories and a plan. The real cost is `TZ = "Asia/Dhaka"` as a module constant: a user abroad
  would have their day roll over at Dhaka midnight, filing entries on the wrong date and breaking
  streaks. Contained, though — `addDays`/`startOfWeek`/`eachDay`/`startOfMonth`/`daysBetween`
  operate on ISO day strings and are **already timezone-free**; only four "what time is it now"
  helpers need threading. **Redis** is deliberately *not* for tenancy (RLS does that, and caching
  per-user rows is a leak risk) — it is for per-user rate limits on the **shared** Groq key,
  a global daily circuit breaker, and `saveIntents` idempotency, once signup is open.
- **⚠️ Bug fixed — every BMI was labelled "Healthy range."** The caption was a hardcoded string, so
  a BMI of 32.7 read *Healthy range* in mint. New `src/lib/health.ts` classifies the four WHO bands
  and returns the caption **and** its accent together, so the two can't drift apart again. Verified
  in-browser across all four bands: 18.0 *Below healthy range* (gold), 23.8 *Healthy range* (mint),
  27.7 *Above healthy range* (orange), 32.7 *Well above healthy range* (rose) — in both themes.
- **⚠️ Bug fixed — "yesterday I weighed 78.5kg" was written to today.** The same class of bug fixed
  for workouts last session; the fix never reached weight, which had no `date` field at all. The
  weight **and** project intents now carry an optional `date` → `clampDate` → `log_date`, both
  actions validate the today/yesterday window the way `setWorkoutDay` does, `log_date` joins each
  action's field whitelist, and both chips gained the Today/Yesterday picker. `logProgress` and
  `addCommit` honour it too, via a shared `resolveLogDate`. Verified: the sentence above now
  produces a Body chip with **Yesterday** active.
- **⚠️ Fixed — a card contradicting the banner above it.** The Workout "This week" caption fired
  *"Consistency strong"* at a hardcoded `>= 3`, so a target of 5 could print it directly under a
  banner saying *behind pace*. It now reads its verdict from the **target engine's own**
  `workout-week` status — literally the same computation as the banner, so they cannot disagree.
  `LOOK` (level → accent) is exported from `target-warning.tsx` rather than re-stated.
- **⚠️ Fixed — an empty account told it was "Trending up — worth a glance."** `up = week >= prevWeek`
  is `0 >= 0`, and `hasData` guarded only the stat card, not the panel subtitle or the chart colour.
  Now a three-way `up | down | flat` behind one `WEEK_TONE` table — an unchanged week reads *Same as
  last week* instead of a decline, and an empty one reads *Nothing logged yet*. Verified both ways.
- **Fixed — "Average mood" was all-time**, over the full 364-day fetch, so a rough fortnight couldn't
  move it. Now a 30-day window, labelled `Average mood 4/5 (30d)`.
- **Verified** on the demo server (:3100) at 1280px and 375px, both themes: all eight routes 200,
  zero console errors, zero horizontal overflow. `tsc --noEmit` clean · `next build` clean ·
  **eslint 0 problems** · `npm test` **73/73** (+12: BMI classifier ×6, date handling ×6).
- **Not verified (needs a signed-in pass):** the commit composer's day toggle only renders when
  `canLog` is true, and the weight/commit writes themselves. Rolls into the standing V2.0 live pass.
- **Noted, not fixed:** `projects/[id]/project-detail-view.tsx:16` defines a local `daysBetween`
  duplicating the one in `lib/dates.ts`. Out of scope for Phase A.
- **Next:** Phase B — the multi-user foundation (schema + accounts + per-user tz/currency).

### 2026-08-26 (later) — Post-V2 audit: phase sweep + bug fixes
- **Phase sweep.** Every roadmap phase is ticked as claimed. The only genuinely
  unfinished items are **infrastructure, not code**: V1 Phase 6's reminders are code-complete
  but need VAPID keys generated, the `send-reminders` Edge Function deployed, migration `0003`
  run, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set (`SUPABASE_SETUP.md` §6); and both V2 pillars still
  want the **signed-in live pass**. Phase 1.5 (per-exercise logging, seasonal themes, export)
  and V2.1/V2.2 remain deliberately not-started.
- **⚠️ Bug fixed — a workout logged "yesterday" was written to today.** The workout intent had
  no date field at all, so `setTodayWorkout` always stamped `dhakaToday()`. The AI box's own
  example sentence — *"yesterday: ৳1200 groceries and a rest day"* — filed the expense on
  yesterday and the rest day on **today**, overwriting a real session if one was already logged.
  Fixed end to end: the intent schema and prompt gained an optional `date`, `intentToDispatch`
  maps it to `log_date` (clamped to the today/yesterday window), the action is now
  **`setWorkoutDay`** and validates `log_date` the same way the expense and journal actions do,
  and the workout chip grew a Today/Yesterday picker. 3 new tests.
- **⚠️ Bug fixed — a review chip's headline went stale the moment you edited it.** The summary
  came from the server's first read of the sentence, so fixing a category still showed
  "Uncategorized" — and that stale text is what a failure toast quotes. The summary is now
  recomputed from the chip's live fields on every edit.
- **⚠️ Bug fixed — numeric progress on a checklist project moved the ring, then didn't.**
  `logProgress` bumped `current_value` even when the project's percentage is owned by
  `recomputeProgress`, so the ring (and every warning quoting it) drifted until the next task was
  ticked, then snapped back. It now refuses with *"This project's progress comes from its
  checklist — tick a task instead."* Projects without a checklist are unchanged.
- **Polish:** Settings' target toggle restores the app **default** when switched back on, not
  `TARGET_LIMITS.min` (turning the monthly cap on used to hand you a ৳100 cap you were instantly
  over); `1 workout` / `1 journal entry` singulars on the Overview cards; the demo weekly budget
  reads from `DEFAULT_TARGETS` instead of a second hardcoded 6000.
- **Demo consistency:** sample project percentages now sit on multiples of 20% so the list card
  and the checklist-driven detail ring quote the same number (p1 was 62% on the list and 60% on
  its own page). Live mode never had this gap — `recomputeProgress` writes the checklist
  percentage into `current_value` itself.
- **eslint is clean for the first time.** The two long-standing `set-state-in-effect` errors are
  gone: `CountUp` reads `prefers-reduced-motion` through `useSyncExternalStore` and renders the
  final value directly when motion is reduced, and `ThemeToggle`'s hydration guard is the same
  external-store trick instead of `useState` + `useEffect`. No behaviour change either side.
- **Verified** on the demo server (:3100): the *"yesterday: …"* example now puts **both** chips on
  Yesterday; editing a chip's category rewrites its headline live; all nine routes 200; the
  Overview attention strip, the Projects banners/badges and each detail ring all quote matching
  percentages; no console errors. `tsc --noEmit` clean · `next build` clean · `npm test` **61/61**
  (+2) · **eslint 0 problems**.
- **Next:** unchanged — one signed-in pass to exercise both pillars against real rows, then the
  reminders deploy, then V2.1 or V2.2.

### 2026-08-26 — V2 Phases 6 & 7 — **V2.0 complete**
- **Phase 6 — warnings where the work happens**
  - Every section page now fetches `getTargets()` alongside its own data and renders `TargetWarnings` under
    the header: Expenses, Workout, Mental Health, Projects. Each uses the new **`sectionTargetStatuses`**,
    which runs the targets through **`targetsForSection`** first — without that, an array the page never
    fetched would read as "nothing logged" and warn about a section it knows nothing about.
  - `TargetInput`’s data arrays became optional so a page can hand over only its own slice.
  - **Projects**: the list shows a banner per off-track project *and* an **Overdue / Behind pace** badge on
    that project’s card; the detail route renders its own banner from `projectTargetStatus`.
  - **Overview**: a **"Needs attention · N"** strip (worst first, capped at 3) plus a status pill on each
    section card (`SectionCard` gained a `badge` slot). `getOverviewData` computes the full `TargetStatus[]`
    once, server-side, and returns it.
  - Demo mode evaluates `DEFAULT_TARGETS` against the sample rows, so the whole feature is visible without keys.
- **Phase 7 — making the two pillars feel like one product**
  - **Target status nudges the mood and the mascot**, *cap-never-lift*: `moodState(signals, score, level)` steps
    a streak down to great on a `warn` and caps at steady on an `over`, but can never push a week *below* what
    the score alone gives; `rabbitStateFor(..., level)` holds back the celebration while something is `over`.
    Wired through `getOverviewData` **and** `getMoodState`, so the app-wide `<html data-mood>` aura reflects it too.
  - **⚠️ Bug found and fixed — "this week" meant two different things.** The app measured weekly/monthly totals
    on **rolling 7- and 30-day windows** while the new target engine uses **real Dhaka weeks and calendar
    months**. On Expenses the banner read *"৳3,480 of ৳6,000, on track"* while the card right below it read
    *"Over budget"*, and the Overview footer disagreed with its own warning. Fixed by moving every
    **user-facing** weekly/monthly claim onto the same boundaries the targets use — Expenses’ This week /
    This month / Avg-per-day cards, the Overview’s spend cards and footer, `rabbitSays`, and `weekWorkouts`
    on both the Overview and Workout. Expenses’ "vs last week" now compares the *same elapsed days* of the
    previous week, so a Wednesday is not measured against a full week. `computeSignals` keeps its rolling
    window on purpose — it is a smoothing input to the Life Score, never labelled "this week" to the user.
  - **⚠️ Bug found and fixed — a warning disagreeing with the ring beside it.** `projectTargetStatus` read
    `current/targetValue` while the project views draw a **checklist-driven** ring; the detail page showed a
    60% ring under a banner saying 62%. The status now uses the same checklist-first rule.
  - **Sample projects gained estimated finish dates** (p1 deliberately overdue, p4 behind pace, p2/p5 on pace,
    p3/p6 dateless) — without them the demo could never show the project half of Pillar 2.
  - Polish: `1 workout` vs `1 workouts` on the Workout header.
- **Open items from the plan, now decided**
  - **Chip-edit affordances**: keep what Phase 3 shipped (select for category/project, toggle for the day,
    emoji row for mood, plain inputs for numbers). No change needed.
  - **`AiLogBox` on the Overview?** **No** — it stays Quick-Add-only. The Overview’s job is reflection, and it
    already carries the attention strip; two competing hero inputs would blur both.
  - **Mental Health target in V2.0?** **Yes** — shipped as `weeklyCheckIns` (default 5/week, switchable off).
- **Verified** on the demo server at 1280px and 375px: the Overview strip lists 3 warnings and the Projects
  card wears a rose "Off track" pill; `/expenses` banner and its This-month card now both read ৳34,430;
  `/projects` shows two banners with matching Overdue/Behind-pace badges while on-pace and date-less projects
  show none; `/projects/p1` banner and ring now both say 60%; `/workout` and `/mental-health` are on track so
  they correctly render **nothing**. All six routes 200, no console errors, no horizontal overflow at 375px.
- **Still not verified:** the **live signed-in pass** — saving targets to `profiles.settings`, the AI box
  writing real rows, and warnings computed from real data. Both V2 pillars need one authenticated session to
  close out; the browser here has no Google session and sign-in cannot be automated.
- `tsc --noEmit` clean; `next build` clean; `npm test` **59/59** (12 new). eslint: **no new** issues (the same
  2 pre-existing `set-state-in-effect` errors).
- **Next:** one signed-in pass to confirm both pillars against real data. After that, V2.1 (AI reflections over
  aggregates + target statuses) or V2.2 (income & savings) per the plan.

### 2026-08-26 — V2 Phases 4 & 5 (Pillar 2: targets & the warning engine)
- **Groq model re-checked against the live API.** `llama-3.3-70b-versatile` is still gone; the roster on
  this key is `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `groq/compound(-mini)`, `qwen/qwen3.6-27b`,
  `qwen/qwen3.8-27b`, plus whisper/guard models. The code already runs **`openai/gpt-oss-120b`** —
  confirmed live with a JSON-mode call. **No change needed.**
- **Phase 4 — targets storage & Settings UI**
  - `src/lib/targets.ts` (pure, client-safe): the `Targets` shape — `monthlyExpenseCap`,
    `weeklyExpenseCap`, `weeklyWorkouts`, `weeklyCheckIns` — where **`null` means "target switched
    off"** and a *missing* key falls back to `DEFAULT_TARGETS` (৳20,000 / ৳6,000 / 4 / 5), so guardrails
    exist before the card is ever opened. `coerceTarget` clamps to `TARGET_LIMITS`; `parseTargets`
    normalises whatever the JSONB holds.
  - `saveTargets` (`settings/actions.ts`) mirrors `saveReminderTime` — writes `profiles.settings.targets`,
    **no migration**. Every field is re-coerced server-side, so a tampered payload can't park a nonsense
    cap. Revalidates all five dashboards, since targets change what each one warns about.
  - `components/settings/targets-card.tsx` — one row per target with an on/off switch (off hides the
    input and shows "No target — warnings off"; switching back on restores the saved value) and a single
    Save that reflects the clamped values the server actually stored.
  - `lib/data/targets.ts` `getTargets()` is the server read. **The weekly cap is now real**: `getOverviewData`
    and `getMoodState` score the money signal against the user's own cap, with `WEEKLY_BUDGET` demoted from
    a hardcoded 6000 to the documented fallback (sourced from `DEFAULT_TARGETS`).
- **Phase 5 — the warning engine (pure)**
  - `computeTargetStatuses({today, targets, expenses, workoutLogs, journal, projects})` → `TargetStatus[]`
    (`{id, section, level: "ok"|"warn"|"over", label, detail, progress}`). Rules:
    **spend caps** — amber from 80% (`WARN_RATIO`), red only *above* the cap; Dhaka calendar month and
    Mon-start week. **Weekly pace** (workouts, check-ins) — `over` once the remaining sessions can no
    longer fit in the days left, `warn` when every remaining day has to count, else `ok`; check-ins count
    one per day, rest days don't count as workouts. **Projects** — `over` when past `target_date` and not
    completed, `warn` when progress lags elapsed time by more than `BEHIND_PACE_SLACK` (15%); completed or
    date-less projects produce nothing.
  - Selectors `attentionStatuses` (non-ok, worst first) / `sectionStatuses` / `worstLevel`.
  - `components/dashboard/target-warning.tsx` — `TargetBadge` (pill), `TargetWarning` (banner, `role="alert"`
    at `over`), `TargetWarnings` (the non-ok ones stacked, renders **nothing** when all clear, optional `limit`).
    Server-safe: no state, no effects.
  - **New design token `--accent-rose`** (`#ff7a8a` dark / `#e0455c` light) — the app had no "something is
    wrong" hue; warn reuses `--accent-orange`, matching the AI box's unresolved-chip styling.
  - `lib/dates.ts` gains `startOfMonth` / `endOfMonth` / `daysInMonth` / `daysBetween`.
- **Verified** on the demo server (`rabbit-verse-demo`, :3100) via a throwaway preview route (since deleted):
  all three banner levels render in their correct accents (mint / orange / rose, confirmed in **both** themes —
  `color-mix` is not stripped), a seeded fixture produced the expected 6 statuses (over-cap, overdue project,
  behind-pace project, workout + check-in pace, weekly cap ok and correctly filtered out), the card's toggles
  hide/restore their inputs and enable Save, and Save's auth guard surfaces **"Please sign in first."** as a
  toast instead of throwing. `/settings` in demo shows the Targets panel in its sign-in placeholder state,
  matching the Reminders pattern. No console errors; zero horizontal overflow at 375px.
- **Not yet verified:** the **live** signed-in round trip (saving targets → rows in `profiles.settings` →
  values re-rendered). Google OAuth needs a real sign-in, which this session couldn't perform — same gap
  as the Phase-3 live write. Do both in one signed-in pass.
- **Deliberately not done here:** wiring warnings into the section views — that is **Phase 6**, and the
  components/selectors it needs are now in place.
- `tsc --noEmit` clean; `next build` clean; `npm test` **47/47** (24 new). eslint: **no new** issues (the same
  2 pre-existing `set-state-in-effect` errors in `theme-toggle.tsx`/`count-up.tsx`).
- **Next:** Phase 6 — render `TargetWarnings` in `expenses-view` / `workout-view` / `projects-view` +
  `/projects/[id]` and an Overview attention strip, with the section pages fetching `getTargets()`.

### 2026-08-26 — V2 Phases 2 & 3 (Pillar 1: AI logging, end to end)
- **Phase 2 — `parseLog` Server Action** (`src/app/(app)/quick-add/ai-actions.ts`):
  - Builds the model's context **server-side from the session** (the user's own categories + ongoing
    projects + Dhaka today/yesterday) rather than trusting anything the client sends.
  - Calls Groq with `response_format: { type: "json_object" }`, `temperature: 0`, then
    `JSON.parse` → `parseResultSchema.safeParse` → `resultToDispatches`. Sentence capped at 500 chars.
  - **Never throws**: a missing key, an unreachable API, unparseable JSON, or schema-invalid output
    each return `{ ok: false, error }` for the box to show.
  - Signed out or no `GROQ_API_KEY` → `demoParse`, a small offline regex parser (money / workout /
    rest day / `n/5` mood / kg), so the whole flow previews without keys.
- **⚠️ Model changed — `llama-3.3-70b-versatile` is retired.** Groq 404s it
  (`model_not_found`); it is gone from `/v1/models`. Verified the live roster and switched
  `GROQ_MODEL` to **`openai/gpt-oss-120b`**, the strongest JSON-mode model now available on the key.
  Verified against the real API: *"ran 5k this morning, spent ৳400 on lunch and 120 taka on a bus,
  read 2 chapters of my book, feeling good 4/5, weighed in at 78.5kg"* → **6 correct intents**
  (Cardio workout, 2 expenses with categories resolved, project progress, mood 4, 78.5 kg); and
  *"yesterday I skipped the gym and felt awful"* → rest day + mood 1 dated **yesterday**.
- **Phase 3 — the AI Log Box** (`src/components/quick-add/ai-log-box.tsx`, mounted in
  `quick-add-hub.tsx` above the manual tabs, behind an "or log it by hand" divider):
  - idle → parsing → review → saving, in the existing glass/`motion`/`sonner` style. Example-sentence
    chips, ⌘/Ctrl+Enter to parse, 500-char cap.
  - **Review chips**, one per intent, each with a real editor (amount + category select + day toggle +
    note · did-it/rest + session type · weight/body-fat · 5-emoji mood + day + reflection · goal select
    + amount) and a remove button. Anything the parser couldn't resolve is ringed amber and **blocks
    Save** until filled (`dispatchUnresolved`).
  - **`saveIntents`** dispatches through the existing `addExpense`/`setTodayWorkout`/`logWeight`/
    `saveJournal`/`logProgress` — one Server Action doing the fan-out server-side (Next dispatches
    client actions sequentially anyway, so this is one round trip and one consistent re-render).
  - **Defence in depth on the way back in:** the client's reviewed chips are re-validated with
    `dispatchSchema` (action whitelist, string-only fields, ≤10 items), required fields re-checked, and
    FormData rebuilt from a per-action **field whitelist** (`sanitizeFields`) — so a tampered payload
    can't smuggle fields into a write path. Each target action still re-checks auth, RLS and the
    today/yesterday window itself. Partial failures come back **keyed by index**, and the box keeps
    only the failed chips so a retry can't double-write what already landed.
- **Verified** (demo server, `rabbit-verse-demo` on :3100): *"spent ৳450 on lunch, did legs, feeling
  good 4/5, 78.5kg this morning"* → 4 chips; unresolved "lunch" category correctly **blocked Save**
  until picked; removing a chip dropped the count to 3; Save fired the toast and cleared the box.
  *"yesterday I spent 300 taka on transport and it was a rest day"* → expense ৳300 with **Transport
  auto-resolved** and the **Yesterday** toggle active, plus a rest day. No console or server errors.
- **Not yet verified:** the **live** signed-in write (real rows in Supabase + Overview/Life-Score
  refresh). The Groq call is verified against the real API and the dispatch logic by tests, but the
  authenticated end-to-end pass needs a sign-in — do this first next session.
- **Known limitation (matches V1):** `setTodayWorkout` always writes *today* — it has no date column
  in its contract — so "yesterday I skipped the gym" records the rest day against today. Expenses and
  journal entries do honour yesterday. Worth revisiting in Phase 7.
- `tsc --noEmit` clean; `npm test` **23/23** (10 new: `dispatchUnresolved`, `sanitizeFields`,
  `dispatchSchema`, `demoParse`). eslint: **no new** issues (same 2 pre-existing
  `set-state-in-effect` errors in `theme-toggle.tsx`/`count-up.tsx`).
- **Next:** Phase 4 — targets storage (`profiles.settings`) + the Settings targets card.

### 2026-08-26 — V2 kickoff · Phase 1 (AI foundations & pure parse layer)
- **V2 planned end-to-end:** after V1, agreed V2.0 = two pillars — (1) AI natural-language logging
  ("type what I did" → parse → review → save over the existing sections) and (2) targets & warnings
  (monthly spend cap, project finish-date overdue, weekly workout pace). Chose **Groq** as the LLM
  (fast, free tier), **review-before-save**, **text input** (iOS dictation covers voice). Split into
  **7 executable phases** — plan at `…/plans/if-v1-is-finished-whimsical-quail.md`.
- **Phase 1 shipped (no user-visible change):**
  - Deps: `groq-sdk`, `zod` (runtime) + `vitest` (dev, first tests in the repo); `npm test` script added.
  - `GROQ_API_KEY` documented in `.env.local.example` + `SUPABASE_SETUP.md` (server-side secret, no `NEXT_PUBLIC_`).
  - `src/lib/ai/groq.ts` — server-only singleton client + `GROQ_MODEL` (`llama-3.3-70b-versatile`) + `isGroqConfigured()`.
  - `src/lib/ai/parse-log.ts` — the `LogIntent` discriminated-union contract + `zod` schema, the
    system/user prompt, and the **pure** `intentToDispatch` mapping that turns a validated intent into
    the exact FormData fields each existing action reads (`addExpense`/`setWorkout`/`logWeight`/
    `saveJournal`/`logProgress`), resolving category/project hints and clamping dates to today/yesterday,
    flagging unresolved refs for the review UI.
  - `src/lib/ai/parse-log.test.ts` — 13 tests (resolution, mapping per kind, schema accept/reject). All pass.
- `tsc --noEmit` clean; `npm test` 13/13. eslint: **no new** issues (the 2 pre-existing
  `set-state-in-effect` errors in `theme-toggle.tsx`/`count-up.tsx` remain).
- **Next:** Phase 2 — the `parseLog` Server Action that calls Groq in JSON mode, validates with the
  Phase-1 schema, and returns typed intents (demo mode returns a canned parse).

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
