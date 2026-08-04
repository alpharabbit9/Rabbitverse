"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js once, app-wide. Rendered inside the app shell. Kept as a
 * tiny client component so the rest of the layout can stay a server component.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration can fail on unsupported browsers / http — safe to ignore.
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
