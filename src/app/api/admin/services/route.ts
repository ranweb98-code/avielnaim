import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/schemas";

async function requireAdmin() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const services = await prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = serviceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        durationMin: parsed.data.durationMin,
        price: parsed.data.price,
        sortOrder: parsed.data.sortOrder ?? 0,
        active: parsed.data.active ?? true,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת שירות" }, { status: 500 });
  }
}
