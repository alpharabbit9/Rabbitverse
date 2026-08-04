import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline — Rabbit Verse" };

// Shown by the service worker when a page navigation is attempted with no
// network. Intentionally tiny and self-contained (no data, no auth).
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm space-y-3">
        <div className="text-5xl">🐰</div>
        <h1 className="text-xl font-bold tracking-tight">You&apos;re offline</h1>
        <p className="text-sm text-fg-secondary">
          Rabbit Verse needs a connection to load your latest data. Reconnect and try again — your logged days are safe.
        </p>
      </div>
    </main>
  );
}
