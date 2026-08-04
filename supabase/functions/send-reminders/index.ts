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

/** Current wall-clock time in Asia/Dhaka (UTC+6, no DST) as "HH:MM". */
function dhakaHHMM(): string {
  const now = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

Deno.serve(async (req) => {
  // Only pg_cron (which knows the shared secret) may trigger sends.
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY);
  const target = dhakaHHMM();

  // Users whose reminder time is this exact minute.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, settings")
    .eq("settings->>reminderTime", target);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!profiles?.length) return new Response(JSON.stringify({ sent: 0, target }), { status: 200 });

  const userIds = profiles.map((p) => p.id);
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

  return new Response(JSON.stringify({ sent, pruned: dead.length, target }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
