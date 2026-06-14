import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { isSlotAvailable } from "@/lib/availability";
import {
  sendCustomerConfirmationEmail,
  sendOwnerNewAppointmentEmail,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { appointmentCreateSchema } from "@/lib/schemas";
import { formatInspoIds, parseInspoIds } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = appointmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, active: true },
    });

    if (!service) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    const available = await isSlotAvailable(data.date, data.time, data.serviceId);
    if (!available) {
      return NextResponse.json(
        { error: "השעה שנבחרה אינה זמינה" },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: service.durationMin,
        servicePrice: service.price,
        date: data.date,
        time: data.time,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        notes: data.notes ?? null,
        inspoIds: formatInspoIds(data.inspoIds ?? []),
        status: "pending",
      },
    });

    const inspoIds = parseInspoIds(appointment.inspoIds);
    const inspoImages =
      inspoIds.length > 0
        ? await prisma.inspoImage.findMany({
            where: { id: { in: inspoIds } },
          })
        : [];

    await Promise.all([
      sendOwnerNewAppointmentEmail({
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        customerEmail: appointment.customerEmail,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
        notes: appointment.notes,
        inspoImages: inspoImages.map((img) => ({
          label: img.label,
          src: img.src,
        })),
      }),
      sendCustomerConfirmationEmail({
        customerEmail: appointment.customerEmail,
        customerName: appointment.customerName,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
        status: "pending",
      }),
    ]);

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Create appointment error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת התור" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const appointments = await prisma.appointment.findMany({
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  return NextResponse.json({ appointments });
}
