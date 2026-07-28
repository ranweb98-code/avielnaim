import { NextRequest, NextResponse } from "next/server";
import { getAdminSlotFit } from "@/lib/availability";
import { isAuthenticated } from "@/lib/auth";
import { availabilityQuerySchema } from "@/lib/schemas";
import { z } from "zod";

const slotFitQuerySchema = availabilityQuerySchema.extend({
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function GET(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = slotFitQuerySchema.safeParse({
    date: searchParams.get("date"),
    serviceId: searchParams.get("serviceId"),
    time: searchParams.get("time"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "פרמטרים לא תקינים", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, serviceId, time } = parsed.data;
  const fit = await getAdminSlotFit(date, time, serviceId);

  if (!fit) {
    return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
  }

  return NextResponse.json(fit);
}
