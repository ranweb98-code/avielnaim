import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "barber-admin-session";
const SESSION_MAX_AGE_SHORT = 60 * 60 * 24;
const SESSION_MAX_AGE_LONG = 60 * 60 * 24 * 90;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_LONG,
};

export function getSessionCookieOptions(remember = true) {
  return {
    ...sessionCookieOptions,
    maxAge: remember ? SESSION_MAX_AGE_LONG : SESSION_MAX_AGE_SHORT,
  };
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(remember = true): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "90d" : "1d")
    .sign(getSecret());
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, sessionCookieOptions);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySession(token);
}

export async function requireAuth(): Promise<boolean> {
  const ok = await isAuthenticated();
  if (!ok) {
    throw new Error("Unauthorized");
  }
  return true;
}

export { COOKIE_NAME };
