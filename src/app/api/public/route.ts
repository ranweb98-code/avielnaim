import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [services, inspoImages, settings] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.inspoImage.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.setting.findMany(),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const workingHours = await prisma.workingHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({
    services,
    inspoImages,
    settings: settingsMap,
    workingHours,
  });
}
