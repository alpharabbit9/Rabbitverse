"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

/*
  The admin group's error boundary. No mascot here — `(app)/error.tsx` shows the
  user's creature having a bad moment, which is the right tone for a dashboard
  and the wrong one for the moderation console.

  The most likely thing to land here by far is `0007_admin.sql` not having been
  applied yet: the read layer throws with that hint rather than rendering an
  empty roster that looks like "you have no users".
*/

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
      <span className="grid size-12 place-items-center rounded-2xl border border-border bg-card-hover">
        <Icon name="TriangleAlert" size={22} style={{ color: "var(--accent-gold)" }} />
      </span>
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-bold tracking-tight">The panel couldn&apos;t load</h1>
        <p className="text-sm text-fg-secondary">{error.message || "Something went wrong reading the roster."}</p>
        {error.digest && <p className="font-mono text-xs text-fg-muted">Digest: {error.digest}</p>}
      </div>
      <Button size="lg" onClick={() => unstable_retry()} faceClassName="px-6">
        Try again
      </Button>
    </div>
  );
}
