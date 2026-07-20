export const PUSH_ENDPOINT_KEY = "pushEndpoint";

export type PushRole = "customer" | "owner";

export type EnsurePushResult =
  | { ok: true; endpoint: string }
  | {
      ok: false;
      reason:
        | "unsupported"
        | "denied"
        | "default"
        | "no-vapid"
        | "sw-unavailable"
        | "subscribe-failed"
        | "save-failed";
      message?: string;
    };

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;

  const displayStandalone = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return displayStandalone || iosStandalone;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function storeEndpoint(endpoint: string) {
  try {
    localStorage.setItem(PUSH_ENDPOINT_KEY, endpoint);
  } catch {
    // ignore quota / private mode
  }
}

export function getStoredPushEndpoint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PUSH_ENDPOINT_KEY);
  } catch {
    return null;
  }
}

export async function ensurePushSubscription(options: {
  role: PushRole;
  phone?: string;
  email?: string;
  updateOnly?: boolean;
}): Promise<EnsurePushResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "unsupported" };
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  if (!("Notification" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission === "denied") {
    return { ok: false, reason: "denied" };
  }
  if (permission !== "granted") {
    return { ok: false, reason: "default" };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { ok: false, reason: "no-vapid" };
  }

  try {
    // Ensure SW is registered before waiting for ready (avoids hang if Gate runs first)
    if (process.env.NODE_ENV !== "development") {
      const existing = await navigator.serviceWorker.getRegistration("/");
      if (!existing) {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      }
    }

    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapidPublicKey
        ) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: "subscribe-failed" };
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        role: options.role,
        phone: options.phone,
        email: options.email,
        updateOnly: options.updateOnly,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        ok: false,
        reason: "save-failed",
        message: data?.error,
      };
    }

    storeEndpoint(json.endpoint);
    return { ok: true, endpoint: json.endpoint };
  } catch (error) {
    console.error("[push-client] ensurePushSubscription failed:", error);
    return { ok: false, reason: "subscribe-failed" };
  }
}
