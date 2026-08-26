/*
  send-reminders — Supabase Edge Function (Deno).

  Invoked once a minute by pg_cron (see migration 0003). It finds every user
  whose Dhaka-local reminder time equals the current minute and sends a Web Push
  notification to each of their stored subscriptions. Dead subscriptions
  (HTTP 404/410) are pruned.

  Required function secrets (supabase secrets set ...):
    PROJECT_URL             https://<ref>.supabase.co
    SERVICE_ROLE_KEY        service-role key (bypasses RLS to read all users)
    VAPID_PUBLIC_KEY        base64url VAPID public key
    VAPID_PRIVATE_KEY       base64url VAPID private key
    VAPID_SUBJECT           mailto:you@example.com
    CRON_SECRET             shared secret; pg_cron sends it as x-cron-secret

  Deploy:  supabase functions deploy send-reminders --no-verify-jwt
*/
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const PROJECT_URL = Deno.env.get("PROJECT_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:reminders@rabbitverse.app";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/**
 * Current wall-clock "HH:MM" in an arbitrary IANA zone.
 *
 * Users choose their own timezone (migration 0004), so a reminder set for 21:00
 * must fire at 21:00 *where they are* — not at Dhaka's. Intl handles DST, which
 * the old fixed +6 offset could not.
 */
function localHHMM(tz: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
  }
}

Deno.serve(async (req) => {
  // Only pg_cron (which knows the shared secret) may trigger sends.
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);
  const now = new Date();

  // Every profile that has a reminder set. The minute comparison can no longer
  // be pushed into the query, because "is it 21:00?" now has a different answer
  // per user — so we filter in memory. Only users with a reminder time are
  // fetched, which keeps this small.
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id, settings, timezone")
    .not("settings->>reminderTime", "is", null);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const due = (profiles ?? []).filter((p) => {
    const wanted = (p.settings as { reminderTime?: string } | null)?.reminderTime;
    return Boolean(wanted) && wanted === localHHMM(p.timezone ?? "Asia/Dhaka", now);
  });
  if (!due.length) return new Response(JSON.stringify({ sent: 0, due: 0 }), { status: 200 });

  const userIds = due.map((p) => p.id);
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const payload = JSON.stringify({
    title: "Rabbit Verse 🐰",
    body: "Time to log your day — projects, workout, spend, mood.",
    url: "/",
  });

  let sent = 0;
  const dead: string[] = [];
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) dead.push(s.id);
    }
  }
  if (dead.length) await supabase.from("push_subscriptions").delete().in("id", dead);

  return new Response(JSON.stringify({ sent, pruned: dead.length, due: due.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
