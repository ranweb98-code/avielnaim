import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [services, inspoImages, settings, workingHours, blockedDates] =
    await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.inspoImage.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.setting.findMany(),
    prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
    prisma.blockedDate.findMany({ orderBy: { date: "asc" } }),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return NextResponse.json(
    {
      services,
      inspoImages,
      settings: settingsMap,
      workingHours,
      blockedDates: blockedDates.map((b) => b.date),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
