import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { sendCustomerConfirmationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { appointmentUpdateSchema } from "@/lib/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const { id } = await params;
  const appointmentId = parseInt(id, 10);

  if (Number.isNaN(appointmentId)) {
    return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = appointmentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!existing) {
      return NextResponse.json({ error: "תור לא נמצא" }, { status: 404 });
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: parsed.data.status },
    });

    await sendCustomerConfirmationEmail({
      customerEmail: appointment.customerEmail,
      customerName: appointment.customerName,
      serviceName: appointment.serviceName,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון התור" }, { status: 500 });
  }
}
