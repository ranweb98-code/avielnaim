import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const ADMIN_PASSWORD_HASH_KEY = "adminPasswordHash";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const testHash = scryptSync(password, salt, 64).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  } catch {
    return false;
  }
}

function getEnvPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "barber2024";
}

async function getStoredPasswordHash(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: ADMIN_PASSWORD_HASH_KEY },
  });
  return setting?.value ?? null;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const storedHash = await getStoredPasswordHash();
  if (storedHash) {
    return verifyPasswordHash(password, storedHash);
  }
  return password === getEnvPassword();
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const valid = await verifyAdminPassword(currentPassword);
  if (!valid) {
    return { ok: false, error: "הסיסמה הנוכחית שגויה" };
  }

  if (newPassword.length < 6) {
    return { ok: false, error: "הסיסמה החדשה חייבת להכיל לפחות 6 תווים" };
  }

  if (currentPassword === newPassword) {
    return { ok: false, error: "הסיסמה החדשה חייבת להיות שונה מהנוכחית" };
  }

  const nextHash = hashPassword(newPassword);
  await prisma.setting.upsert({
    where: { key: ADMIN_PASSWORD_HASH_KEY },
    create: { key: ADMIN_PASSWORD_HASH_KEY, value: nextHash },
    update: { value: nextHash },
  });

  return { ok: true };
}
