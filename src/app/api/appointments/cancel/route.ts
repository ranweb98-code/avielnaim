import { NextRequest, NextResponse } from "next/server";
import { verifyCancelToken } from "@/lib/cancel-token";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "קישור לא תקין" }, { status: 400 });
  }

  const appointmentId = await verifyCancelToken(token);
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
    return NextResponse.json({
      success: true,
      alreadyCancelled: true,
      appointment: {
        date: appointment.date,
        time: appointment.time,
        serviceName: appointment.serviceName,
      },
    });
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "cancelled" },
  });

  return NextResponse.json({
    success: true,
    appointment: {
      date: appointment.date,
      time: appointment.time,
      serviceName: appointment.serviceName,
    },
  });
}
