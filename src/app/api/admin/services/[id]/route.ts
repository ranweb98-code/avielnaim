import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/schemas";

type RouteParams = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }
  return null;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const serviceId = parseInt(id, 10);

  if (Number.isNaN(serviceId)) {
    return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = serviceSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = await prisma.service.update({
      where: { id: serviceId },
      data: parsed.data,
    });

    return NextResponse.json({ service });
  } catch {
    return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const serviceId = parseInt(id, 10);

  if (Number.isNaN(serviceId)) {
    return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  }

  try {
    await prisma.service.delete({ where: { id: serviceId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
  }
}
