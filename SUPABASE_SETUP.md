# Connecting Rabbit Verse to Supabase

Rabbit Verse runs in **demo mode** (sample data, no login) until you add Supabase keys.
Follow these once to enable sign-in + real data. Free tier is plenty.

> **Multi-user as of V3.0.** Anyone can create an account (email + password, or Google);
> every row stays private to its owner through Row-Level Security. Demo mode is now
> **local development only** — a production build with keys always sends a signed-out
> visitor to `/login`.

## 1. Create the project
1. Go to [supabase.com](https://supabase.com) → **New project** (free tier).
2. Pick a name + a strong database password, region closest to Dhaka (e.g. Singapore).

## 2. Create the schema
1. In the dashboard → **SQL Editor** → **New query**.
2. Run each migration in `supabase/migrations/` **in order**, pasting the file contents
   and pressing **Run**:
   - [`0001_init.sql`](supabase/migrations/0001_init.sql) — tables, RLS policies, and the
     on-signup trigger that seeds categories + a 7-day workout plan.
   - [`0002_project_details.sql`](supabase/migrations/0002_project_details.sql) — project
     goals, task checklist, dated commits.
   - [`0003_reminders.sql`](supabase/migrations/0003_reminders.sql) — the `pg_cron` job for
     push reminders (see §6).
   - [`0004_multi_user.sql`](supabase/migrations/0004_multi_user.sql) — **V3.0**: the
     `public.users` roster, `profiles` renamed to `user_profiles` with per-user timezone /
     currency / locale / mascot, and a rewritten `handle_new_user()` that writes the roster
     row and the profile inside the signup transaction. Idempotent; safe to re-run.

## 3. Enable Google sign-in
1. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
   → create an **OAuth client ID** (type: Web application).
2. Under **Authorized redirect URIs** add your Supabase callback:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client secret**.
4. In Supabase → **Authentication → Providers → Google** → paste them and enable.
5. In Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (and your Vercel URL later)
   - **Redirect URLs:** add `http://localhost:3000/**` (and your prod URL).

## 4. Add your keys locally
1. Copy `.env.local.example` → `.env.local`.
2. From Supabase → **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. _(Optional)_ Set `NEXT_PUBLIC_SITE_URL` if you're not on `localhost:3000`.
4. _(Optional, V2 AI logging)_ Set `GROQ_API_KEY` to a free key from
   [console.groq.com/keys](https://console.groq.com/keys). This powers the
   "type what I did" box; without it the box falls back to a simple offline
   preview parser, and the manual Quick-Add forms work regardless. It's a
   **server-side** secret — no `NEXT_PUBLIC_` prefix, never exposed to the browser.
   The model lives in `src/lib/ai/groq.ts` (currently `openai/gpt-oss-120b`).
   Groq retires models periodically — if parsing starts failing with
   `model_not_found`, list what your key can reach and swap that one constant:

   ```bash
   curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
   ```
5. Restart `npm run dev`.

## 5. Sign in
Visit `http://localhost:3000` → you'll be redirected to `/login`. Either **Continue with
Google**, or use the email + password form; **Create an account** is on `/signup` and
**Forgot?** leads to `/forgot-password`.

Email + password signup needs confirmation mail to work: Supabase →
**Authentication → Providers → Email** → keep *Confirm email* on and make sure
`http://localhost:3000/**` (plus your production URL) is in **URL Configuration →
Redirect URLs**, or the confirmation and reset links will bounce. On the free tier
Supabase's built-in mailer is rate-limited — wire up an SMTP provider before real users.

**Suspending an account.** There is no admin UI. In the SQL editor:

```sql
update public.users set status = 'suspended' where email = 'someone@example.com';
```

They are then turned away at sign-in, at the OAuth callback, and on their next page
load if they were already signed in. Only the service role can change `status` — the
roster's RLS gives users read-only access to their own row, so nobody can un-suspend
themselves.

> Deploying to Vercel later: add the same env vars in the Vercel project, set
> `NEXT_PUBLIC_SITE_URL` to your Vercel URL, and add that URL to the Supabase redirect list
> and Google authorized redirect URIs.

## 6. Daily reminders (Web Push) — optional but part of v1

The app already has: a service worker (`public/sw.js`), a subscribe toggle in
**Settings → Reminders**, and server actions that store each device's
subscription in `push_subscriptions`. To make the scheduled push actually fire,
finish these one-time steps:

1. **Generate a VAPID keypair** (once):
   ```bash
   npx web-push generate-vapid-keys
   ```
   Copy the **public** key into `.env.local` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   (and into Vercel env). Keep the **private** key for step 3.

2. **Apply the reminders migration:** open `supabase/migrations/0003_reminders.sql`,
   replace `<PROJECT_REF>` and `<CRON_SECRET>` (any long random string), then run
   it in the SQL editor. It enables `pg_cron` + `pg_net` and schedules the sender
   every minute.

3. **Set the Edge Function secrets** (Supabase CLI, from the repo root):
   ```bash
   supabase secrets set \
     PROJECT_URL=https://<PROJECT_REF>.supabase.co \
     SERVICE_ROLE_KEY=<service-role-key> \
     VAPID_PUBLIC_KEY=<public-key> \
     VAPID_PRIVATE_KEY=<private-key> \
     VAPID_SUBJECT=mailto:you@example.com \
     CRON_SECRET=<same-secret-as-step-2>
   ```

4. **Deploy the function:**
   ```bash
   supabase functions deploy send-reminders --no-verify-jwt
   ```

5. **Turn it on:** in the app → **Settings → Reminders**, flip the toggle (grant
   the notification permission) and set your time. On iPhone, first **Add to Home
   Screen** — iOS only allows Web Push for an installed PWA.

Test without waiting for the clock: temporarily set your reminder time to the
next minute, or `curl` the function with the `x-cron-secret` header.

## 7. Redis guardrails (V3.0 Phase E) — optional, but do it before public signup

Rabbit Verse is multi-user, and every user shares **one** Groq API key. Nothing
below is about data isolation — RLS already handles that. It stops one person
from spoiling the shared key for everyone, and adds idempotency so a retried save
can't double-write:

- **per-user rate limits** — `parseLog` at 20/hour, `transcribe` at 30/day
  (audio is the costly path);
- a **global daily circuit breaker** on the key, so one user can't burn the whole
  quota;
- **idempotency** on `saveIntents`.

It's backed by [Upstash Redis](https://console.upstash.com) over its REST API
(HTTP — no serverless connection-pool problem — and a free tier). Everything in
`src/lib/redis.ts` **degrades to a no-op when unconfigured** (and fails open on a
Redis error), so the app runs identically with none of this set — the guardrails
simply don't engage until you wire them.

1. **Create a database** at <https://console.upstash.com> → **Create Database**
   (Regional is fine; pick a region near your deployment).

2. **Copy the REST credentials:** open the database → **REST API** and copy
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into `.env.local`
   (and into your Vercel/host env). Optionally set `GROQ_DAILY_LIMIT` (defaults
   to 5000 calls/UTC-day across all users).

3. **That's it.** No migration, no code change to flip on — the guardrails detect
   the env vars at runtime. Verify from Upstash's **Data Browser**: after a few
   AI-box uses you'll see `rl:parse:*` / `rl:transcribe:*` counters, a
   `cb:groq:<date>` circuit-breaker key, and `idem:*` claims appear and expire.
