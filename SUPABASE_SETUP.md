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
