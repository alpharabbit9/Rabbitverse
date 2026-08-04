# Connecting Rabbit Verse to Supabase

Rabbit Verse runs in **demo mode** (sample data, no login) until you add Supabase keys.
Follow these once to enable private sign-in + real data. Free tier is plenty.

## 1. Create the project
1. Go to [supabase.com](https://supabase.com) → **New project** (free tier).
2. Pick a name + a strong database password, region closest to Dhaka (e.g. Singapore).

## 2. Create the schema
1. In the dashboard → **SQL Editor** → **New query**.
2. Paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and **Run**.
   - This creates all tables, Row-Level-Security policies, and a trigger that seeds
     your categories + 7-day workout plan on first sign-in.

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
3. Set `ALLOWED_EMAIL` to the single Google account allowed in (already defaulted to yours).
4. Restart `npm run dev`.

## 5. Sign in
Visit `http://localhost:3000` → you'll be redirected to `/login` → **Continue with Google**.
Only the `ALLOWED_EMAIL` account is let through; anyone else is bounced with a message.

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
