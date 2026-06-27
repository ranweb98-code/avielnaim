import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSession,
  clearSessionCookie,
  getSessionCookieOptions,
} from "@/lib/auth";
import { verifyAdminPassword } from "@/lib/admin-password";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "סיסמה נדרשת" }, { status: 400 });
    }

    const valid = await verifyAdminPassword(parsed.data.password);

    if (!valid) {
      return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
    }

    const remember = parsed.data.remember ?? true;
    const token = await createSession(remember);
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, getSessionCookieOptions(remember));

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
