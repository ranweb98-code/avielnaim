import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function createCancelToken(appointmentId: number): Promise<string> {
  return new SignJWT({ appointmentId, purpose: "cancel" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyCancelToken(
  token: string
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "cancel") return null;
    const id = payload.appointmentId;
    if (typeof id !== "number") return null;
    return id;
  } catch {
    return null;
  }
}

export function getCancelUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/cancel?token=${encodeURIComponent(token)}`;
}
