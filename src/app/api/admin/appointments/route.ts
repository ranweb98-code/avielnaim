import { NextRequest, NextResponse } from "next/server";
import { isSlotAvailable } from "@/lib/availability";
import { upsertCustomerFromBooking } from "@/lib/customers";
import { sendCustomerAdminBookingEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { appointmentCreateSchema } from "@/lib/schemas";
import { formatInspoIds } from "@/lib/utils";
import { isAuthenticated } from "@/lib/auth";

async function requireAdmin() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

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
        status: "confirmed",
      },
    });

    if (appointment.customerEmail) {
      await sendCustomerAdminBookingEmail({
        appointmentId: appointment.id,
        customerEmail: appointment.customerEmail,
        customerName: appointment.customerName,
        date: appointment.date,
        time: appointment.time,
      });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Admin create appointment error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת התור" },
      { status: 500 }
    );
  }
}
