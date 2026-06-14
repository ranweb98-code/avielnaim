import "server-only";
import { prisma } from "@/lib/prisma";

export async function getSettingsMap(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany();
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export async function getSetting(
  key: string,
  fallback = ""
): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}
