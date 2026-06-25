import { NextRequest, NextResponse } from "next/server";
import { getDaySchedule } from "@/lib/availability";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { availabilityQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    date: searchParams.get("date"),
    serviceId: searchParams.get("serviceId"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "פרמטרים לא תקינים", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, serviceId } = parsed.data;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, active: true },
  });

  if (!service) {
    return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
  }

  const authed = await isAuthenticated();
  const schedule = await getDaySchedule(date, serviceId, {
    includeOccupiedLabels: authed,
  });

  return NextResponse.json({
    ...schedule,
    date,
    serviceId,
  });
}
