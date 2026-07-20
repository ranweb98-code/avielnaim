"use client";

import { useEffect } from "react";

export function SerwistRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.isSecureContext) return;
    if (!("serviceWorker" in navigator)) return;

    // Serwist does not emit sw.js in development — skip quiet failures there.
    if (process.env.NODE_ENV === "development") return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(console.error);
  }, []);

  return null;
}
