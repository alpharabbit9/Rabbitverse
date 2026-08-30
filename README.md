# Rabbit Verse 🐇

A **multi-user life-tracking PWA** — a calm "life operating system" that turns four life
areas into visible trends, a GitHub-style activity heatmap, and a combined dashboard with a code-drawn
mascot (six species, your pick) that reacts to your progress.

Four sections: **Projects · Workout · Expenses · Mental Health**, plus an **All** dashboard.
Dark by default, premium and animated. Anyone can hold an account — email + password or Google — with
every row scoped to its owner by Row-Level Security, an AI "type what I did" box, and an owner-only
admin panel for moderation and the signup gate.

> **Status:** feature-complete through V4.0 Part 1 in code. Supabase auth + real data are wired
> end-to-end; the app still **defaults to demo mode** (deterministic sample data) until Supabase keys
> are set and `NEXT_PUBLIC_DEMO_MODE=false`. See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for exactly
> what's done and what's next.

## Docs

- **[`PROJECT_STATUS.md`](PROJECT_STATUS.md)** — plan + progress tracker; what's done, what's next, session log. **Start here.**
- **[`design.md`](design.md)** — design system: philosophy, themes, colors.
- **[`AGENTS.md`](AGENTS.md)** — contributor note: this repo uses a modified Next.js — read the guides in `node_modules/next/dist/docs/` before writing code.

## Tech stack

Next.js 16.2 (App Router, Turbopack) · React 19.2 · Tailwind CSS v4 + shadcn/ui · `motion` v12 ·
Recharts 3.10 · Supabase (Postgres + RLS + email/Google auth) · Groq (AI parsing + Whisper) ·
Upstash Redis (rate-limit guardrails) · `sonner` · `next-themes`. Free tiers only.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The UI is fully interactive on sample data —
no environment variables or database needed. To run against real data, complete
[`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) and set `NEXT_PUBLIC_DEMO_MODE=false`.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Deploy to Vercel

The app is zero-config on Vercel — it auto-detects Next.js, and thanks to the demo-mode
fallback it **builds and runs even with no environment variables** (it just serves sample data).

1. Push this repo to GitHub, then **Import** it in Vercel (Framework preset: Next.js — auto-detected).
2. Deploy. That first deploy already works in demo mode.
3. To enable private sign-in + real data, first complete [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md),
   then add these in **Vercel → Project → Settings → Environment Variables**:

   | Variable | Required | Notes |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | for auth | Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for auth | Supabase → Project Settings → API (anon public) |
   | `SUPABASE_SERVICE_ROLE_KEY` | for the admin panel | Supabase → Project Settings → API (`service_role`). Bypasses RLS — server-only, never `NEXT_PUBLIC_`. Without it `/admin` is read-only. |
   | `NEXT_PUBLIC_SITE_URL` | recommended | Your canonical URL, e.g. `https://rabbit-verse.vercel.app` — used for the OAuth redirect |
   | `GROQ_API_KEY` | for the AI box | Free key from [console.groq.com/keys](https://console.groq.com/keys). Powers the "type what I did" parser + voice transcription; without it the box falls back to an offline parser and the mic is hidden. |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | for reminders | VAPID **public** key (`npx web-push generate-vapid-keys`); the private key is an Edge Function secret. Without it the reminders toggle shows "not configured". |
   | `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | before public signup | Upstash Redis REST creds — per-user rate limits + a daily circuit breaker on the shared Groq key. Unset ⇒ every guardrail fails open (no-op). See `SUPABASE_SETUP.md` §7. |

4. Add your production URL to the **Supabase redirect list** and **Google authorized redirect URIs**
   (see `SUPABASE_SETUP.md` §3), then redeploy so the new env vars take effect.

> Without the Supabase vars the deployment stays in demo mode — no error, just sample data.

## Conventions

- All "today/yesterday", streaks, and heatmap buckets are computed in **each user's own timezone**
  (default Asia/Dhaka), set in Settings.
- Backfill window is **today + yesterday only**, then locked.
- Currency is **per-user** (default ৳ BDT), set in Settings. UI copy is English only.
