import { NextRequest, NextResponse } from "next/server";
import {
  getAdminSlotFit,
  isAdminSlotAvailable,
  isSlotAvailable,
} from "@/lib/availability";
import { upsertCustomerFromBooking } from "@/lib/customers";
import { sendCustomerAdminBookingEmail } from "@/lib/email";
import {
  linkPushEndpointToCustomer,
  sendPushToCustomer,
} from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { adminAppointmentCreateSchema } from "@/lib/schemas";
import { formatInspoIds } from "@/lib/utils";
import { isAuthenticated } from "@/lib/auth";
import { MIN_APPOINTMENT_DURATION } from "@/lib/scheduling";

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
    const parsed = adminAppointmentCreateSchema.safeParse(body);

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

    const fit = await getAdminSlotFit(data.date, data.time, data.serviceId);
    if (!fit) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    const requestedDuration = data.serviceDuration ?? service.durationMin;

    if (fit.maxFitDuration < MIN_APPOINTMENT_DURATION) {
      return NextResponse.json(
        { error: "אין מספיק זמן לקביעת תור במועד זה" },
        { status: 409 }
      );
    }

    if (fit.fitsFully) {
      if (requestedDuration !== service.durationMin) {
        return NextResponse.json(
          { error: "משך התור אינו תואם לשירות הנבחר" },
          { status: 400 }
        );
      }

      const available = await isSlotAvailable(
        data.date,
        data.time,
        data.serviceId,
        { skipAdvanceCheck: true }
      );
      if (!available) {
        const adminAvailable = await isAdminSlotAvailable(
          data.date,
          data.time,
          data.serviceId,
          service.durationMin
        );
        if (!adminAvailable) {
          return NextResponse.json(
            { error: "השעה שנבחרה אינה זמינה" },
            { status: 409 }
          );
        }
      }
    } else {
      if (requestedDuration !== fit.maxFitDuration) {
        return NextResponse.json(
          {
            error: `אין מספיק זמן לשירות (${service.durationMin} דק'). ניתן לקבוע תור של ${fit.maxFitDuration} דק' בלבד`,
            maxFitDuration: fit.maxFitDuration,
            catalogDuration: fit.catalogDuration,
          },
          { status: 409 }
        );
      }

      const adminAvailable = await isAdminSlotAvailable(
        data.date,
        data.time,
        data.serviceId,
        requestedDuration
      );
      if (!adminAvailable) {
        return NextResponse.json(
          { error: "השעה שנבחרה אינה זמינה" },
          { status: 409 }
        );
      }
    }

    const appointmentDuration = requestedDuration;

    const customer = await upsertCustomerFromBooking({
      name: data.customerName,
      phone: data.customerPhone,
      email: data.customerEmail,
    });

    const appointment = await prisma.appointment.create({
      data: {
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: appointmentDuration,
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

    await linkPushEndpointToCustomer(
      data.pushEndpoint,
      appointment.customerPhone,
      appointment.customerEmail
    );

    if (appointment.customerEmail) {
      await sendCustomerAdminBookingEmail({
        appointmentId: appointment.id,
        customerEmail: appointment.customerEmail,
        customerName: appointment.customerName,
        date: appointment.date,
        time: appointment.time,
      });
    }

    await sendPushToCustomer(
      appointment.customerPhone,
      appointment.customerEmail,
      {
        title: "נקבע לך תור",
        body: `${appointment.serviceName} · ${appointment.date} בשעה ${appointment.time}`,
        url: "/",
        tag: `appt-admin-${appointment.id}`,
      },
      { alsoEndpoint: data.pushEndpoint }
    ).catch((err) => console.error("Admin booking push failed:", err));

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("Admin create appointment error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת התור" },
      { status: 500 }
    );
  }
}
