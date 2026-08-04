/*
  Rabbit Verse service worker.

  Two jobs:
  1. Web Push — receive the daily reminder pushed by the Supabase Edge Function
     and surface it as a notification, then focus/open the app when tapped.
  2. PWA installability + a tiny offline fallback for navigations. We deliberately
     do NOT cache dynamic pages (the app is personal, always-fresh data), so the
     fetch handler is network-first and only falls back to a minimal offline
     card when the network is unreachable.

  Bump CACHE_VERSION to force old caches out on the next activate.
*/
const CACHE_VERSION = "rv-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Network-first for page navigations; on failure show the cached offline card.
// Everything else falls straight through to the network (no stale asset caching).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    fetch(req).catch(async () => {
      const cache = await caches.open(CACHE_VERSION);
      return (await cache.match(OFFLINE_URL)) ?? new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
    }),
  );
});

// A reminder was pushed from the server.
self.addEventListener("push", (event) => {
  let payload = { title: "Rabbit Verse", body: "Time to log your day 🐰", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "rabbit-reminder",
      renotify: true,
      data: { url: payload.url || "/" },
    }),
  );
});

// Focus an existing tab if we have one, otherwise open a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) {
        if ("focus" in client) {
          client.navigate?.(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
