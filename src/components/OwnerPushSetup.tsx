"use client";

import { useEffect } from "react";
import {
  ensurePushSubscription,
  isStandaloneDisplay,
  notificationPermission,
} from "@/lib/push-client";

/** Registers the admin device for owner push when permission is granted. */
export function OwnerPushSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // iOS Web Push only works from the Home Screen (standalone) app
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (isIOS && !isStandaloneDisplay()) return;

    if (notificationPermission() !== "granted") return;

    void ensurePushSubscription({ role: "owner" }).then((result) => {
      if (!result.ok) {
        console.warn("[OwnerPushSetup]", result.reason, result.message);
      }
    });
  }, []);

  return null;
}
