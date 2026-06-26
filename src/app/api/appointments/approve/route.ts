import { NextRequest, NextResponse } from "next/server";
import { verifyApproveToken } from "@/lib/cancel-token";
import { sendCustomerConfirmationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "קישור לא תקין" }, { status: 400 });
  }

  const appointmentId = await verifyApproveToken(token);
  if (!appointmentId) {
    return NextResponse.json(
      { error: "קישור לא תקין או שפג תוקפו" },
      { status: 400 }
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    return NextResponse.json({ error: "תור לא נמצא" }, { status: 404 });
  }

  if (appointment.status === "cancelled") {
    return NextResponse.json(
      { error: "לא ניתן לאשר תור שבוטל" },
      { status: 409 }
    );
  }

  if (appointment.status === "confirmed") {
    return NextResponse.json({
      success: true,
      alreadyConfirmed: true,
      appointment: {
        date: appointment.date,
        time: appointment.time,
        serviceName: appointment.serviceName,
        customerName: appointment.customerName,
      },
    });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "confirmed" },
  });

  if (updated.customerEmail) {
    await sendCustomerConfirmationEmail({
      customerEmail: updated.customerEmail,
      customerName: updated.customerName,
      serviceName: updated.serviceName,
      date: updated.date,
      time: updated.time,
      status: "confirmed",
    });
  }

  return NextResponse.json({
    success: true,
    appointment: {
      date: updated.date,
      time: updated.time,
      serviceName: updated.serviceName,
      customerName: updated.customerName,
    },
  });
}
