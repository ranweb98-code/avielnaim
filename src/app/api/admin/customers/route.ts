import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { formatCustomerName, searchCustomers, storeFullName } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { customerCreateSchema } from "@/lib/schemas";
import { formatJerusalemDate } from "@/lib/timezone";

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

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const customers = await searchCustomers(q);
  const today = formatJerusalemDate();

  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      customerId: { in: customers.map((c) => c.id) },
      status: { in: ["pending", "confirmed"] },
      date: { gte: today },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    select: {
      id: true,
      customerId: true,
      date: true,
      time: true,
      serviceName: true,
      status: true,
    },
  });

  const upcomingByCustomer = new Map<
    number,
    (typeof upcomingAppointments)[number]
  >();
  for (const appt of upcomingAppointments) {
    if (appt.customerId && !upcomingByCustomer.has(appt.customerId)) {
      upcomingByCustomer.set(appt.customerId, appt);
    }
  }

  return NextResponse.json({
    customers: customers.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: formatCustomerName(c.firstName, c.lastName),
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      appointmentCount: c._count.appointments,
      upcomingAppointment: upcomingByCustomer.get(c.id) ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = customerCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const existing = await prisma.customer.findFirst({
      where: { phone: data.phone.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "לקוח עם מספר טלפון זה כבר קיים" },
        { status: 409 }
      );
    }

    const { firstName, lastName } = storeFullName(data.fullName);

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        phone: data.phone.trim(),
        email: data.email ?? "",
        notes: data.notes?.trim() || null,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת לקוח" }, { status: 500 });
  }
}
