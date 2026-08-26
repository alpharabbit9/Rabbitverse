# Rabbit Verse — V3.0 "Many Rabbits" + V2.1 polish

## Context

Rifat asked two things in sequence: *what would you improve in the existing features?* — and then
three product changes: **multi-user**, a **user-chosen mascot**, and **voice input in the AI box**.

I read the app end to end rather than guessing. Two findings shape the whole plan:

**Multi-user is not a data-model rewrite.** RLS is already `auth.uid() = user_id` on all ten tables
(`0001_init.sql:130-146`), and `handle_new_user()` already seeds per-user categories and a workout
plan. Data isolation works today. What does *not* work is everything the app assumes about *one
particular* user: `TZ = "Asia/Dhaka"` is a module constant in `lib/dates.ts:7`, `taka()` hardcodes
৳, `'Rifat'` is the display-name fallback in three places including the SQL trigger, and
`ALLOWED_EMAIL` locks sign-in to one Google account.

**The timezone constant is the real cost.** A user in London logging at 23:00 would have their day
roll over at Dhaka's midnight — five hours early — silently filing entries against the wrong date and
breaking their streak. The good news, and it changes the size of this job: `addDays`, `startOfWeek`,
`eachDay`, `startOfMonth`, `daysBetween` all operate on ISO day strings and are **already
timezone-free**. Only four functions actually ask "what time is it now" (`dhakaToday`, `dhakaHour`,
`isWithinLogWindow`, `greeting`). Thread a `tz` through those four and the refactor is contained.

Alongside that, six defects and gaps in the existing features are worth fixing — two of them live
bugs, one of them the *same* bug fixed for workouts last session that never reached weight logging.

Deliverable: **`updatePlan.md` in the repo root** (first step below), then the work.

### Decisions taken

| | |
|---|---|
| **Signup** | Users create their own accounts. A `public.users` roster table + a `public.user_profiles` table, both written **transactionally** at signup. |
| **Locale** | Per-user timezone **and** currency. |
| **Branding** | Rifat is reworking the title and logo separately — so the mascot layer is built **brand-agnostic** and the existing `logo-mark.png` is left alone. |
| **Voice** | Groq Whisper (`whisper-large-v3-turbo`) on the key already in use. |

### Stated assumption

"Users have to create an account" is read as **email + password signup added alongside the existing
Google OAuth** — a real `/signup` form, email confirmation, and password reset. Google stays. If the
intent was Google-only with self-serve access, drop task **B2** and the plan still holds.

### On Redis

Straight answer: **Redis is not needed for multi-tenancy** — RLS already does that, and caching
per-user rows in Redis is a data-leak risk if a key is ever built wrong. But once signup is open and
every user shares **one Groq API key**, three things do need it, and they are not optional:

- per-user sliding-window rate limits on `parseLog` and the new `transcribe` (audio upload is the
  expensive one);
- a global daily circuit-breaker on the Groq key, so one user cannot burn the quota for everyone;
- idempotency keys on `saveIntents`, so a retried save cannot double-write.

**Upstash Redis** (`@upstash/redis` + `@upstash/ratelimit`) — HTTP-based, so no TCP connection-pool
problem on serverless, and a free tier. `src/lib/redis.ts` degrades to a no-op when unconfigured,
exactly as `isGroqConfigured()` does today.

---

## Findings in the existing features (all verified)

### Correctness

| # | What's wrong | Where |
|---|---|---|
| 1 | **BMI always reads "Healthy range."** The caption is `{bmi ? "Healthy range" : …}` — a BMI of 31 is labelled healthy, in mint. | `workout-view.tsx:86` |
| 2 | **"yesterday I weighed 78.5kg" is filed under today.** The `weight` intent has no `date` field (`parse-log.ts:37`, prompt line 102) and `logWeight` hardcodes today. Identical to the workout bug fixed last session — the fix never reached weight. | `parse-log.ts:181`, `workout/actions.ts:62` |
| 3 | **Project commits and progress are today-only** while expenses, journal and workouts honour today+yesterday. | `projects/actions.ts:168`, `:231` |
| 4 | **Hardcoded `>= 3` contradicts your own target.** "Consistency strong" fires at 3 workouts even when `targets.weeklyWorkouts` is 5 — so the card says *Consistency strong* directly under a banner saying *behind pace*. | `workout-view.tsx:76` |
| 5 | **An empty account is told it's "Trending up — worth a glance"** in orange: `up = 0 >= 0`, and `hasData` guards the stat card but not the panel subtitle or the chart colour. | `expenses-view.tsx:49, 78` |
| 6 | **"Average mood" is all-time**, over the full 364-day fetch, so a rough month cannot move the number in the header. | `mental-view.tsx:29` |

### Data you cannot reach or fix

7. **Nothing you log can be edited or deleted.** `expenses` is insert-only — there is no `update` and
   no `delete` anywhere in `src/` for a logged expense (verified; `quick-add/actions.ts:32` is the
   only write). A mistyped ৳4500 is permanent: it skews the month, trips the cap warning, drags the
   `money` signal and the Life Score, with no recovery in the UI. Journal entries are upsert-only, so
   anything older than yesterday is frozen; commits can only be appended to; projects cannot be
   renamed, archived or deleted.
8. **Only the 6 most recent expenses are ever visible** (`expenses/page.tsx:26`). The app cannot
   answer *"what did I spend on Tuesday?"*
9. **Charts are hardcoded to 30 days** though the spec promises weekly/monthly/yearly and the
   fetchers already pull 364.

### Performance & resilience

10. **The mood pipeline runs on every page, then again on the Overview.** `(app)/layout.tsx:15` calls
    `getMoodState()` → 5 queries + `getTargets()`; `(app)/page.tsx:31` then calls `getOverviewData()`
    → the *same* 5 queries + `getTargets()` again. **No `React.cache()` exists anywhere in `src/`.**
    `getTargets()` alone runs 2–3× per request on every route.
11. **A year of expense rows is serialized to the browser for a 30-day chart** — only the heatmap
    needs the year, and it needs per-day *counts*, not rows.
12. **No `loading.tsx`, no `error.tsx`, no `Suspense` anywhere** (zero matches). Navigation blocks on
    a blank screen and one Supabase hiccup drops Next's raw error page inside an installed PWA.

### Config baked into SQL

13. Expense categories cannot be added, renamed or recoloured — and the AI parser resolves against
    that frozen list, so anything unlisted is permanently "Uncategorized".
14. The 7-day workout plan is unchangeable (`0001_init.sql:167`); the panel is read-only for life.
15. No data export (Phase 1.5, still open).

---

## Build order

The multi-user foundation rewrites the date layer that everything else stands on, so it goes early —
but the six correctness fixes are small and shouldn't wait behind it.

```
A. Correctness fixes        (small, ships first, low conflict)            ✅ shipped
B. Multi-user foundation    (schema · accounts · per-user tz & currency)  ✅ shipped
C. Mascot system            (independent — can run in parallel with B)    ← next
D. Voice input              (independent — can run in parallel with B)
E. Redis guardrails         (MUST land before public signup goes live)
F. Edit & delete            (needs B's session helper)
G. Depth, performance, resilience, user-owned config
```

---

## A — Correctness fixes

- `src/lib/health.ts` (new, pure, tested): a BMI classifier — Under `<18.5`, Healthy `18.5–24.9`,
  Above `25–29.9`, High `≥30` — with the accent following the band (`--accent-gold` / `--accent-mint`
  / `--accent-orange` / the `--accent-rose` token Phase 5 added). Wire into `workout-view.tsx:86`.
- `workout-view.tsx`: take `targets` as a prop (the page already fetches it for the banner) and
  derive the "This week" caption from `targets.weeklyWorkouts` instead of `>= 3`.
- `parse-log.ts`: give the `weight` intent an optional `date` exactly as `workout` has it — thread it
  through `intentToDispatch` → the existing `clampDate` → a new `log_date` field, add `log_date` to
  `ACTION_FIELDS.logWeight`, update the prompt's shape line, and give the weight chip in
  `ai-log-box.tsx` the same Today/Yesterday toggle the workout chip has. `logWeight` validates the
  window the way `setWorkoutDay` does.
- `projects/actions.ts`: `addCommit` and `logProgress` accept an optional validated `log_date`; the
  commit composer gets the same toggle.
- `expenses-view.tsx`: gate the trend subtitle and chart colour on `hasData`.
- `mental-view.tsx`: average mood over 30 days, labelled *"Average mood (30d)"*.

---

## B — Multi-user foundation

### B1 · Schema — `supabase/migrations/0004_multi_user.sql`

> **Numbering corrected while building.** The plan said `0005`/`0006`, but the repo's migrations
> stop at `0003` — there is no `0004`. Shipped as `0004_multi_user.sql`, and F's editable-logs
> migration becomes `0005_editable_logs.sql`, so the sequence stays contiguous.

Supabase owns identity in `auth.users` (email, provider, password hash) and that cannot be replaced —
so the two tables asked for sit *beside* it:

- **`public.users`** — the roster. `id uuid pk references auth.users(id) on delete cascade`,
  `email citext not null unique`, `status text not null default 'active' check (status in
  ('active','suspended'))`, `role text not null default 'member'`, `created_at`. This is the
  queryable list of all users; `auth.users` is not reachable under the anon key.
- **`public.user_profiles`** — `alter table public.profiles rename to user_profiles`, so existing
  rows, the PK and every FK survive. Gains `avatar_url`, `mascot text not null default 'rabbit'`,
  `timezone text not null default 'Asia/Dhaka'`, `currency text not null default 'BDT'`,
  `locale text not null default 'en'`. Keeps `height_cm` and the `settings` JSONB that already
  holds `targets` + `reminderTime`.
- RLS on both, matching the existing pattern: `auth.uid() = id` / `auth.uid() = user_id`.
  `public.users` is `select`-own + `update`-own-restricted (status and role are service-role only, so
  a user cannot un-suspend themselves).
- Backfill `public.users` from `auth.users` for the existing account.

**The transaction.** `handle_new_user()` is an `after insert on auth.users … for each row` trigger,
which already runs **inside the signup transaction** — if it raises, the `auth.users` insert rolls
back with it. So extending it to write `users` + `user_profiles` + the category and plan seeds gives
exactly the atomicity asked for, with no application-level two-phase commit and no orphan rows. Two
things to get right:

- it is `security definer`, so it must keep `set search_path = public` (already does);
- an exception aborts signup with an opaque error. The `users` and `user_profiles` inserts *should*
  hard-fail — an account without a profile is broken. The category and plan **seeds** are
  nice-to-have, so they go in their own `begin … exception when others then null; end` block: a
  seed hiccup must never cost someone their account. A `seedProfileDefaults()` action backfills.
- drop the `'Rifat'` fallback → `split_part(new.email, '@', 1)`.

### B2 · Account creation

- `/signup` route + `SignUpForm`; `signUpWithPassword` / `signInWithPassword` server actions over
  `supabase.auth.signUp` with email confirmation. `/login` gains the password form and a "Create an
  account" link. `/forgot-password` + `/auth/reset` via `resetPasswordForEmail`.
- **Delete `ALLOWED_EMAIL`** from `lib/supabase/config.ts` and its gate in `auth/callback/route.ts`;
  the callback instead rejects `public.users.status = 'suspended'`.
- `proxy.ts`: `/signup` and `/forgot-password` join the public paths; suspended users route to a
  `/suspended` page.
- **Demo mode becomes local-dev-only.** `isSupabaseConfigured` currently flips the whole app; on a
  configured deployment a signed-out visitor must land on `/login`, never on Rifat-shaped sample
  data. Keep the flag, narrow its meaning, and say so in `.env.local.example`.

### B3 · Per-user timezone & currency

- `lib/dates.ts`: `TZ` becomes `DEFAULT_TZ = "Asia/Dhaka"` and the four now-dependent helpers take a
  tz — `dhakaToday()` → `todayIn(tz)`, `dhakaHour()` → `hourIn(tz)`, `isWithinLogWindow(iso, tz)`,
  `greeting(tz)`. **The pure day-arithmetic helpers are untouched** — they already operate on
  timezone-free ISO strings. Defaults keep Rifat's behaviour bit-identical.
- **`src/lib/session.ts` (new)** — a `React.cache()`d `getSession()` returning
  `{ userId, tz, currency, locale, mascot, status }`, read once per request from `user_profiles`.
  Every server action and fetcher takes its "today" from here instead of calling `dhakaToday()`.
  This is also the fix for finding #10 — it collapses the repeated profile reads.
- Currency: `taka(n)` → `money(n, currency, locale)` over `Intl.NumberFormat`, plus a `<Money>`
  component and a `CurrencyProvider` seeded in `(app)/layout.tsx` so client components don't each
  thread a prop. Replaces the ~15 literal `৳` strings (`expenses-view`, `expense-form`,
  `quick-add-hub`, `targets-card`, `ai-log-box`, `overview.ts:207`).
- The AI prompt (`parse-log.ts:107`) is told the user's currency and timezone rather than hardcoded
  Taka; `demoParse`'s `৳|tk|taka` regex becomes currency-aware.
- Settings: Timezone and Currency become real selects (IANA list via `Intl.supportedValuesOf`,
  plus a common-currency shortlist), replacing the static rows at `settings/page.tsx:69-70`.
- `send-reminders` compares against each user's own tz, not Dhaka; the copy at
  `reminders-card.tsx:120` follows.
- **Changing timezone does not rewrite history** — stored dates are already-committed ISO day
  strings. The change applies going forward, with a one-line note under the select.
- `'Rifat'` fallbacks in `lib/data/overview.ts:121` and `lib/data/profile.ts:42-43` become the
  profile's own name, then the email local-part.

---

## C — Mascot system

`src/components/mascot/` becomes a registry:

- `types.ts` — `MascotState = "sleeping" | "walking" | "running" | "celebrating"` (the existing four
  poses), `MascotSpecies`, and per-species copy.
- `shell.tsx` — the parts of today's `rabbit.tsx` that aren't the animal: the glow aura, the four
  motion presets, the charge streaks, the victory shards, the state→eye-colour map. Every species
  renders through it, so they all move alike and only the SVG body differs.
- One file per creature, code-drawn SVG in the same angular warrior style, same
  `(state, size, glow, className)` contract — no asset pipeline, no extra bytes, correct in both
  themes: **Rabbit** (existing, default), **Fox**, **Wolf**, **Owl**, **Cat**, **Dragon**.
- `registry.ts` — `MASCOTS: Record<MascotSpecies, {name, Component, copy}>` + a safe
  `resolveMascot(value)` for an unknown string in the DB.

Renames (mechanical, type-checked): `RabbitState` → `MascotState`, `rabbitStateFor` → `mascotStateFor`
(`motivation.ts:25`), `RabbitSays` → `MascotSays` with the heading rendering `{name} says`.

**Only two components actually render the mascot** — `page-header.tsx:68` and `rabbit-says.tsx:32` —
so the wiring is small: species comes from `getSession()` and is passed down from `(app)/layout.tsx`.

Settings gains a `MascotCard`: a six-tile picker, each tile live-animating in its `walking` state,
saved by a `saveMascot` action (same `requireUser` → validate → `revalidatePath` shape as
`saveTargets`). Demo keeps the rabbit.

`logo-mark.png` in the sidebar and login is **brand, not mascot**, and is left untouched — the mascot
layer is deliberately brand-agnostic so the rebrand Rifat is working on drops straight in.

---

## D — Voice input

- `ai-log-box.tsx` gains a mic button beside the parse button: tap to start, tap to stop, with a live
  waveform (Web Audio `AnalyserNode`), an elapsed timer and a 60-second cap.
- `transcribe(formData)` server action → `groq.audio.transcriptions.create({ model:
  "whisper-large-v3-turbo", file })`. The text lands **in the textarea**, editable, and **never
  auto-parses** — same review-before-commit principle the whole box is built on.
- Guards: `audio/webm;codecs=opus` with an `audio/mp4` fallback for Safari; ≤25 MB and ≤60 s;
  rate-limited through **E**; a denied mic permission surfaces a toast, not a crash;
  `isGroqConfigured()` hides the button when the key is absent; demo shows a sign-in state.
- Whisper rather than the Web Speech API precisely because this app is used as an **installed PWA on
  iOS**, where `SpeechRecognition` is unreliable — and because Whisper handles ৳/taka and mixed
  Bangla-English far better. `getUserMedia` needs HTTPS and a user gesture; both hold here.

---

## E — Redis guardrails

`src/lib/redis.ts` — an Upstash client that no-ops when unconfigured.

- `parseLog`: e.g. 20/hour/user. `transcribe`: e.g. 30/day/user (audio is the costly path).
- A global daily counter on the Groq key as a circuit breaker, so one user cannot exhaust everyone's
  quota; over the line returns a clean `{ ok: false, error }` — both actions already never throw.
- `saveIntents` takes an idempotency key so a retried save cannot double-write.
- Env documented in `.env.local.example` + `SUPABASE_SETUP.md`.

**Not used for caching user rows** — `React.cache()` covers per-request dedupe, and a mis-keyed
Redis entry is a cross-user data leak.

---

## F — Edit & delete

`supabase/migrations/0005_editable_logs.sql` — additive `update`/`delete` RLS policies for
`expenses`, `journal_entries`, `project_logs`. New actions in the existing guard shape:
`updateExpense`/`deleteExpense` (new `expenses/actions.ts`), `deleteJournalEntry`,
`updateCommit`/`deleteCommit`/`renameProject`/`deleteProject`.

**Editing an old row is allowed; creating one is not.** The today+yesterday window exists to stop
retro-fabricating a streak — correcting a row you genuinely logged three weeks ago is the opposite,
it makes the history truer. Worth a code comment so a later session doesn't "fix" it back.

UI: a row-level ⋯ menu (Edit / Delete) on the recent-expenses list, the journal list and the commit
timeline, editing inline through `ExpenseForm`/`JournalForm` in an "editing" mode rather than new
components. Destructive actions confirm inline (a second click on a rose-tinted button), not a
modal — that matches the app's calm register. `sonner` toast with **Undo**.

---

## G — Depth, performance, resilience, config

- **Expense history**: a `HistoryPanel` on `/expenses` — grouped by day, category filter, note
  search, month stepper, day totals — fed by `getExpenseHistory(month)` so it pages by month.
- **Range toggle** (`7d · 30d · 90d · 1y`) shared by the Expenses, Weight, Mood and Life-Score
  trends. The fetchers already return 364 days, so this is client-side slicing plus the `days`
  argument `computeLifeTrend` already takes. Persisted in `localStorage`.
- **`React.cache()`** on `getSession`, `getTargets`, `getProfileSummary`, and a shared
  `getSignalRows(today)` that both `getMoodState` and `getOverviewData` call — Overview drops from
  ~14 Supabase queries to ~7, with no staleness risk since `cache()` is per-request.
- `getExpensesData` returns `{ categories, expenses30, heatmapCounts }`, aggregating the year
  server-side with the existing `bump`/`buildActivity`; same for the mental and workout fetchers.
- **`loading.tsx` per route** (a `<Skeleton>` primitive matching each page's card grid) + `Suspense`
  around heavy panels so the header and warnings paint immediately. **`error.tsx`** at `(app)/` —
  branded, mascot in its `difficult` state, digest, `reset()` retry. Plus `not-found.tsx`.
- `useOptimistic` on the two highest-frequency toggles — ticking a checklist task, marking a workout
  done/rest.
- **Categories card** in Settings (add / rename / recolour / pick an icon / delete non-preset, which
  nulls `category_id` via the existing `on delete set null`). The AI parser picks new categories up
  for free — `ai-actions.ts` already builds its context from the user's own rows.
- **Workout plan editor** on `/workout` writing `workout_plan_days` (`unique (user_id, weekday)`
  already enforces one row per day).
- **Export**: `src/app/api/export/route.ts` streaming every owned table as JSON, plus per-table CSV,
  with a Download button in Settings → Data. Closes the last open Phase 1.5 item.

---

## Files

**New:** `updatePlan.md` · `src/lib/session.ts` · `src/lib/redis.ts` · `src/lib/health.ts` ·
`src/lib/money.ts` · `src/components/mascot/{types,shell,registry,fox,wolf,owl,cat,dragon}.tsx` ·
`src/components/settings/{mascot-card,categories-card,locale-card}.tsx` ·
`src/app/signup/` · `src/app/forgot-password/` · `src/app/(app)/expenses/{actions.ts,history-panel.tsx}` ·
`src/components/ui/{range-toggle,skeleton,money}.tsx` · `src/app/(app)/workout/plan-editor.tsx` ·
`src/app/api/export/route.ts` · `src/app/(app)/{loading,error,not-found}.tsx` ·
`supabase/migrations/{0004_multi_user,0005_editable_logs}.sql`

**Modified:** `lib/dates.ts` (the four now-functions) · `lib/data/*` · `lib/utils.ts` ·
`lib/motivation.ts` · `lib/ai/parse-log.ts` + prompt · `app/auth/*` · `proxy.ts` ·
`lib/supabase/config.ts` · `app/(app)/layout.tsx` · the four `*-view.tsx` · every `actions.ts` ·
`components/quick-add/ai-log-box.tsx` · `components/dashboard/{page-header,rabbit-says}.tsx` ·
`supabase/functions/send-reminders/index.ts` · `.env.local.example` · `SUPABASE_SETUP.md` ·
`PROJECT_STATUS.md`

**Reused, not rebuilt:** `Panel`, `StatCard`, `TargetWarnings`, `ExpenseForm`, `JournalForm`,
`buildActivity`/`bump`/`computeLifeTrend`, `clampDate` + `ACTION_FIELDS`, `coerceTarget`/`parseTargets`,
the pure date helpers, and the `requireUser` → validate → `revalidatePath` action shape.

---

## Verification

Per phase, not saved for the end. `npx tsc --noEmit`, `npx next build` and `npx eslint` are all clean
today and stay clean; `npm test` is 61/61 today and should land near 100.

New tests: BMI classifier · weight/commit date clamping · `money()` across currencies and locales ·
`todayIn(tz)` at a day boundary · mascot registry resolution incl. an unknown species · rate-limit
windows · expense-history grouping · range slicing.

Browser passes on the demo server at 1280px and 375px: BMI captions across all four bands; the empty
account showing no false "Trending up"; all six mascots in all four states in both themes; every
range-toggle position; skeletons on a throttled navigation; `error.tsx` via a deliberately thrown
error in a scratch route.

**Signed-in passes** — several of these cannot be verified in demo mode at all:

1. **Two accounts.** Sign up a second user, log data in both, confirm neither sees the other's rows,
   and confirm a hand-forged cross-user query is denied by RLS.
2. **Signup atomicity.** Force `handle_new_user()` to raise and confirm **no** orphan `auth.users`
   row survives; then force only the *seed* block to fail and confirm the account is still created
   and usable.
3. **Timezone.** Set a profile to `America/New_York` and confirm "today", the log window, the streak
   and the reminder all roll at NY midnight while Rifat's Dhaka account is unchanged.
4. **Currency.** Switch to USD and confirm every amount, the targets card and the AI prompt follow.
5. **Voice.** Record on the installed iOS PWA, confirm the transcript lands editable and un-parsed.
6. **Mascot.** Switch species and confirm the header and "says" card follow app-wide.
7. **Edit/delete.** Edit an expense amount, delete it, confirm the month total and the cap warning
   both move. Then the still-outstanding V2.0 pass: the AI box writing real rows, targets saving to
   `user_profiles.settings`.

Close by updating `PROJECT_STATUS.md` with a session-log entry, per the standing habit.

## Deliberately not in scope

V2.2 income & savings · AI weekly reflections · per-exercise workout logging · seasonal themes ·
illustrated mascot art · the brand/logo rework (Rifat's, in progress) · the reminders deploy
(infrastructure, still blocked on VAPID keys and the Edge Function deploy — `SUPABASE_SETUP.md` §6).
