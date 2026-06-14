import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inspoSchema } from "@/lib/schemas";

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

  const images = await prisma.inspoImage.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ images });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = inspoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const image = await prisma.inspoImage.create({
      data: {
        src: parsed.data.src,
        label: parsed.data.label,
        tags: parsed.data.tags ?? "",
        sortOrder: parsed.data.sortOrder ?? 0,
        active: parsed.data.active ?? true,
      },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Create inspo error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת תמונה" }, { status: 500 });
  }
}
