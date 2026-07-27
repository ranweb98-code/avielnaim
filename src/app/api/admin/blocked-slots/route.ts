import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blockedTimeSlotSchema } from "@/lib/schemas";
import { timeToMinutes } from "@/lib/timezone";

async function requireAdmin() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "תאריך לא תקין" }, { status: 400 });
  }

  const blockedSlots = await prisma.blockedTimeSlot.findMany({
    where: { date },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ blockedSlots });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = blockedTimeSlotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date, startTime, endTime, reason } = parsed.data;
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (end <= start) {
      return NextResponse.json(
        { error: "שעת הסיום חייבת להיות אחרי שעת ההתחלה" },
        { status: 400 }
      );
    }

    const blockedSlot = await prisma.blockedTimeSlot.create({
      data: {
        date,
        startTime,
        endTime,
        reason: reason?.trim() || null,
      },
    });

    return NextResponse.json({ blockedSlot }, { status: 201 });
  } catch (error) {
    console.error("Create blocked slot error:", error);
    return NextResponse.json({ error: "שגיאה בחסימת שעות" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const idParam = request.nextUrl.searchParams.get("id");
  const id = idParam ? parseInt(idParam, 10) : NaN;

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  }

  try {
    await prisma.blockedTimeSlot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "חסימה לא נמצאה" }, { status: 404 });
  }
}
