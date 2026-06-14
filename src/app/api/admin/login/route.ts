import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSession,
  clearSessionCookie,
  sessionCookieOptions,
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
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "שגיאה בהתחברות" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
