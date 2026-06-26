import { NextRequest, NextResponse } from "next/server";
import { changeAdminPassword } from "@/lib/admin-password";
import { isAuthenticated } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/schemas";

export async function PATCH(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }

    const result = await changeAdminPassword(
      parsed.data.currentPassword,
      parsed.data.newPassword
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון הסיסמה" }, { status: 500 });
  }
}
