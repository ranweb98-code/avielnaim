"use client";

import { useEffect } from "react";
import {
  ensurePushSubscription,
  notificationPermission,
} from "@/lib/push-client";

/** Silently registers the admin device for owner push when permission is already granted. */
export function OwnerPushSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (notificationPermission() !== "granted") return;

    void ensurePushSubscription({ role: "owner" });
  }, []);

  return null;
}
