/*
  Client-side Web Push helpers. These run in the browser only (they touch
  navigator / window). The VAPID *public* key is safe to expose; the private key
  lives only in the Supabase Edge Function that sends the pushes.
*/

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** True when the browser can register a service worker and receive push. */
export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** The VAPID applicationServerKey must be a Uint8Array, base64url → bytes. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function ready(): Promise<ServiceWorkerRegistration> {
  // Registration is kicked off app-wide by <ServiceWorkerRegister/>; wait for it.
  return navigator.serviceWorker.ready;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function toPayload(sub: PushSubscription): PushSubscriptionPayload {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  };
}

/** Whether this browser currently has an active push subscription. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await ready();
  return reg.pushManager.getSubscription();
}

/**
 * Ask permission, subscribe with our VAPID key, and return the payload to store.
 * Throws with a friendly message the UI can toast.
 */
export async function subscribeToPush(): Promise<PushSubscriptionPayload> {
  if (!isPushSupported()) throw new Error("Push isn't supported on this browser.");
  if (!VAPID_PUBLIC_KEY) throw new Error("Reminders aren't configured yet (missing VAPID key).");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was denied.");

  const reg = await ready();
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  return toPayload(sub);
}

/** Unsubscribe locally; returns the endpoint that was removed (to delete server-side). */
export async function unsubscribeFromPush(): Promise<string | null> {
  const sub = await getExistingSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
