"use client";

import { useEffect } from "react";
import { useMascot } from "@/components/mascot/provider";

/*
  The (app) error boundary — anything a page throws lands here, inside the shell,
  so the sidebar and nav survive and the user is never dropped onto a blank page.

  The user's own mascot shows up in its `sleeping` pose: the same creature they
  picked, having a bad moment. `digest` is printed because it's the only handle
  the server logs share with what the user can see.
*/

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const { Component: Mascot, name } = useMascot();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <Mascot state="sleeping" size={140} />
      <div className="max-w-sm space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-fg-secondary">
          {name} stumbled and dropped your page. Nothing you logged is lost — this is usually temporary.
        </p>
        {error.digest && <p className="font-mono text-xs text-fg-muted">Digest: {error.digest}</p>}
      </div>
      <button
        onClick={() => unstable_retry()}
        className="rounded-xl border border-border bg-card-solid px-6 py-2.5 text-sm font-medium transition-colors hover:border-border-strong hover:bg-card-hover"
      >
        Try again
      </button>
    </div>
  );
}
