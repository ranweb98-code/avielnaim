import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { formatCustomerName, searchCustomers, storeFullName } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { customerCreateSchema } from "@/lib/schemas";

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
