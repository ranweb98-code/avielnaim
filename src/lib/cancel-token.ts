import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

type TokenPurpose = "cancel" | "approve";

async function createAppointmentToken(
  appointmentId: number,
  purpose: TokenPurpose
): Promise<string> {
  return new SignJWT({ appointmentId, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

async function verifyAppointmentToken(
  token: string,
  purpose: TokenPurpose
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== purpose) return null;
    const id = payload.appointmentId;
    if (typeof id !== "number") return null;
    return id;
  } catch {
    return null;
  }
}

function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function createCancelToken(appointmentId: number): Promise<string> {
  return createAppointmentToken(appointmentId, "cancel");
}

export async function verifyCancelToken(
  token: string
): Promise<number | null> {
  return verifyAppointmentToken(token, "cancel");
}

export function getCancelUrl(token: string): string {
  return `${getAppBaseUrl()}/cancel?token=${encodeURIComponent(token)}`;
}

export async function createApproveToken(
  appointmentId: number
): Promise<string> {
  return createAppointmentToken(appointmentId, "approve");
}

export async function verifyApproveToken(
  token: string
): Promise<number | null> {
  return verifyAppointmentToken(token, "approve");
}

export function getApproveUrl(token: string): string {
  return `${getAppBaseUrl()}/approve?token=${encodeURIComponent(token)}`;
}
