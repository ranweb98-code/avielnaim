import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { isSlotAvailable } from "@/lib/availability";
import { upsertCustomerFromBooking } from "@/lib/customers";
import { deleteOldAppointments } from "@/lib/cleanup";
import {
  sendCustomerSelfBookingEmail,
  sendOwnerNewAppointmentEmail,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { appointmentCreateSchema } from "@/lib/schemas";
import { getSetting } from "@/lib/settings";
import { formatInspoIds } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const bookingMode = await getSetting("bookingMode", "self");
    if (bookingMode === "admin") {
      return NextResponse.json(
        { error: "קביעת תורים זמינה רק דרך המנהל" },
        { status: 403 }
      );
    }

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

    const customer = await upsertCustomerFromBooking({
      name: data.customerName,
      phone: data.customerPhone,
      email: data.customerEmail,
    });

    const appointment = await prisma.appointment.create({
      data: {
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: service.durationMin,
        servicePrice: service.price,
        date: data.date,
        time: data.time,
        customerId: customer.id,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        notes: data.notes ?? null,
        inspoIds: formatInspoIds(data.inspoIds ?? []),
        status: "pending",
      },
    });

    const emailTasks: Promise<unknown>[] = [
      sendOwnerNewAppointmentEmail({
        appointmentId: appointment.id,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        serviceName: appointment.serviceName,
        date: appointment.date,
        time: appointment.time,
      }),
    ];

    if (appointment.customerEmail) {
      emailTasks.push(
        sendCustomerSelfBookingEmail({
          appointmentId: appointment.id,
          customerEmail: appointment.customerEmail,
          customerName: appointment.customerName,
          date: appointment.date,
          time: appointment.time,
        })
      );
    }

    const emailResults = await Promise.allSettled(emailTasks);
    for (const result of emailResults) {
      if (result.status === "rejected") {
        console.error("Email task rejected:", result.reason);
      }
    }

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

  await deleteOldAppointments();

  const appointments = await prisma.appointment.findMany({
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  return NextResponse.json({ appointments });
}
