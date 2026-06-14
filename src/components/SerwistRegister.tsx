"use client";

import { useEffect } from "react";

export function SerwistRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return null;
}
