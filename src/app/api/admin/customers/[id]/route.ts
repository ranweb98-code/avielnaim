import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { formatCustomerName, storeFullName } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { customerUpdateSchema } from "@/lib/schemas";

async function requireAdmin() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  return null;
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const customerId = parseInt(id, 10);
  if (Number.isNaN(customerId)) {
    return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      appointments: {
        orderBy: [{ date: "desc" }, { time: "desc" }],
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
  }

  return NextResponse.json({
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      fullName: formatCustomerName(customer.firstName, customer.lastName),
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      appointments: customer.appointments,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const customerId = parseInt(id, 10);
  if (Number.isNaN(customerId)) {
    return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = customerUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.phone) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          phone: data.phone.trim(),
          NOT: { id: customerId },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "מספר טלפון כבר בשימוש" },
          { status: 409 }
        );
      }
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(data.fullName !== undefined
          ? storeFullName(data.fullName)
          : {}),
        ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.notes !== undefined
          ? { notes: data.notes?.trim() || null }
          : {}),
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון לקוח" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const customerId = parseInt(id, 10);
  if (Number.isNaN(customerId)) {
    return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  }

  const appointmentCount = await prisma.appointment.count({
    where: { customerId },
  });

  if (appointmentCount > 0) {
    return NextResponse.json(
      {
        error: `לא ניתן למחוק — ללקוח ${appointmentCount} תורים במערכת`,
        appointmentCount,
      },
      { status: 409 }
    );
  }

  await prisma.customer.delete({ where: { id: customerId } });
  return NextResponse.json({ ok: true });
}
