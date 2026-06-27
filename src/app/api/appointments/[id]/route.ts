import { NextRequest, NextResponse } from "next/server";
import { isSlotAvailable } from "@/lib/availability";
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

    const data = parsed.data;
    const targetServiceId = data.serviceId ?? existing.serviceId;
    const targetDate = data.date ?? existing.date;
    const targetTime = data.time ?? existing.time;

    if (data.date || data.time || data.serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: targetServiceId, active: true },
      });

      if (!service) {
        return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
      }

      const available = await isSlotAvailable(
        targetDate,
        targetTime,
        targetServiceId,
        { excludeAppointmentId: appointmentId, skipAdvanceCheck: true }
      );

      if (!available) {
        return NextResponse.json(
          { error: "השעה שנבחרה אינה זמינה" },
          { status: 409 }
        );
      }

      const appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          date: targetDate,
          time: targetTime,
          serviceId: service.id,
          serviceName: service.name,
          serviceDuration: service.durationMin,
          servicePrice: service.price,
        },
      });

      if (data.status !== undefined) {
        await sendCustomerConfirmationEmail({
          customerEmail: appointment.customerEmail,
          customerName: appointment.customerName,
          serviceName: appointment.serviceName,
          date: appointment.date,
          time: appointment.time,
          status: appointment.status,
        });
      }

      return NextResponse.json({ appointment });
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    if (data.status !== undefined) {
      await sendCustomerConfirmationEmail({
        customerEmail: appointment.customerEmail,
        customerName: appointment.customerName,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
      });
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error("Update appointment error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון התור" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!existing) {
      return NextResponse.json({ error: "תור לא נמצא" }, { status: 404 });
    }

    await prisma.appointment.delete({
      where: { id: appointmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete appointment error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת התור" }, { status: 500 });
  }
}
