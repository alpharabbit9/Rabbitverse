# Rabbit Verse 🐇

A **private, single-user life-tracking PWA** — a calm "life operating system" that turns four life
areas into visible trends, a GitHub-style activity heatmap, and a combined dashboard with a code-drawn
rabbit mascot that reacts to your progress.

Four sections: **Projects · Workout · Expenses · Mental Health**, plus an **All** dashboard.
Dark by default, premium and animated. Single user, Google sign-in locked to one allowlisted email.

> **Status:** the full front-end is built and animated, but currently runs on **deterministic sample
> data** — there is **no backend yet** (no auth, database, or persistence). See
> [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for exactly what's done and what's next.

## Docs

- **[`PROJECT_STATUS.md`](PROJECT_STATUS.md)** — plan + progress tracker; what's done, what's next, session log. **Start here.**
- **[`design.md`](design.md)** — design system: philosophy, themes, colors.
- **[`AGENTS.md`](AGENTS.md)** — contributor note: this repo uses a modified Next.js — read the guides in `node_modules/next/dist/docs/` before writing code.

## Tech stack

Next.js 16.2 (App Router, Turbopack) · React 19.2 · Tailwind CSS v4 + shadcn/ui · `motion` v12 ·
Recharts 3.10 · Supabase (Postgres + Google auth, planned) · `sonner` · `next-themes`. Free tiers only.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The UI is fully interactive on sample data —
no environment variables or database needed yet.

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
   | `ALLOWED_EMAIL` | for auth | The single Google account allowed to sign in |
   | `NEXT_PUBLIC_SITE_URL` | recommended | Your canonical URL, e.g. `https://rabbit-verse.vercel.app` — used for the OAuth redirect |

4. Add your production URL to the **Supabase redirect list** and **Google authorized redirect URIs**
   (see `SUPABASE_SETUP.md` §3), then redeploy so the new env vars take effect.

> Without the Supabase vars the deployment stays in demo mode — no error, just sample data.

## Conventions

- All dates, streaks, and heatmap buckets are computed in **Asia/Dhaka (UTC+6)**.
- Backfill window is **today + yesterday only**, then locked.
- Currency is **৳ BDT**; the app is English-only.
