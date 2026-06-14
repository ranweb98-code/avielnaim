import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "סיסמה נדרשת" }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD ?? "barber2024";

    if (parsed.data.password !== adminPassword) {
      return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
    }

    const token = await createSession();
    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "שגיאה בהתחברות" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
