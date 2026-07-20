import "server-only";
import { createRequire } from "node:module";
import { normalizePhone } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

const require = createRequire(import.meta.url);
const webpush = require("web-push") as typeof import("web-push");

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type StoredSubscription = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:owner@example.com";

  if (!publicKey || !privateKey) {
    console.warn("[push] Missing VAPID keys");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function toWebPushSubscription(sub: StoredSubscription) {
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };
}

export async function sendToSubscription(
  sub: StoredSubscription,
  payload: PushPayload
): Promise<boolean> {
  if (!ensureVapid()) return false;

  try {
    await webpush.sendNotification(
      toWebPushSubscription(sub),
      JSON.stringify(payload)
    );
    return true;
  } catch (error: unknown) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : null;

    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription
        .delete({ where: { endpoint: sub.endpoint } })
        .catch(() => undefined);
      return false;
    }

    console.error("[push] send failed:", error);
    return false;
  }
}

export async function sendPushToOwners(payload: PushPayload): Promise<number> {
  if (!ensureVapid()) return 0;

  const subs = await prisma.pushSubscription.findMany({
    where: { role: "owner" },
  });

  let sent = 0;
  for (const sub of subs) {
    if (await sendToSubscription(sub, payload)) sent++;
  }
  return sent;
}

function phoneVariants(phone: string): string[] {
  const trimmed = phone.trim();
  const normalized = normalizePhone(trimmed);
  const digits = trimmed.replace(/\D/g, "");
  const variants = new Set<string>([trimmed, normalized, digits]);

  if (digits.startsWith("972") && digits.length > 3) {
    variants.add(`0${digits.slice(3)}`);
  }
  if (digits.startsWith("0") && digits.length > 1) {
    variants.add(`972${digits.slice(1)}`);
  }

  return [...variants].filter(Boolean);
}

export async function sendPushToCustomer(
  phone: string | null | undefined,
  email: string | null | undefined,
  payload: PushPayload
): Promise<number> {
  if (!ensureVapid()) return 0;

  const or: Array<{ phone?: string; email?: string }> = [];

  if (phone?.trim()) {
    for (const variant of phoneVariants(phone)) {
      or.push({ phone: variant });
    }
  }

  if (email?.trim()) {
    or.push({ email: email.trim().toLowerCase() });
    or.push({ email: email.trim() });
  }

  if (or.length === 0) return 0;

  const subs = await prisma.pushSubscription.findMany({
    where: {
      role: "customer",
      OR: or,
    },
  });

  // Deduplicate by endpoint
  const unique = new Map(subs.map((s) => [s.endpoint, s]));

  let sent = 0;
  for (const sub of unique.values()) {
    if (await sendToSubscription(sub, payload)) sent++;
  }
  return sent;
}

export async function linkPushEndpointToCustomer(
  endpoint: string | null | undefined,
  phone: string,
  email?: string | null
): Promise<void> {
  if (!endpoint?.trim()) return;

  try {
    await prisma.pushSubscription.update({
      where: { endpoint: endpoint.trim() },
      data: {
        phone: phone.trim(),
        ...(email?.trim()
          ? { email: email.trim().toLowerCase() }
          : {}),
      },
    });
  } catch {
    // Endpoint may not exist yet — ignore
  }
}
