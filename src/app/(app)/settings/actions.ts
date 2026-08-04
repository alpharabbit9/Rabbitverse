"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PushSubscriptionPayload } from "@/lib/push";

export type ActionResult = { ok: boolean; error: string | null };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Store (or refresh) this device's push subscription. Endpoint is unique per device. */
export async function savePushSubscription(sub: PushSubscriptionPayload): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!sub?.endpoint || !sub.p256dh || !sub.auth) return { ok: false, error: "Incomplete subscription." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, error: null };
}

/** Remove a device's push subscription (on disable / unsubscribe). */
export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!endpoint) return { ok: true, error: null };

  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, error: null };
}

/** Save the daily reminder time (Dhaka-local "HH:MM") into profiles.settings. */
export async function saveReminderTime(time: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: "Enter a valid time." };

  const { data: prof } = await supabase.from("profiles").select("settings").maybeSingle();
  const settings = { ...(prof?.settings as Record<string, unknown> | null), reminderTime: time };

  const { error } = await supabase.from("profiles").update({ settings }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, error: null };
}
