import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  role: z.enum(["customer", "owner"]).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  updateOnly: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let role = data.role ?? "customer";

    if (role === "owner") {
      const authed = await isAuthenticated();
      if (!authed) {
        return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
      }
    } else {
      role = "customer";
    }

    if (data.updateOnly) {
      const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint: data.endpoint },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "מנוי לא נמצא" },
          { status: 404 }
        );
      }

      const updated = await prisma.pushSubscription.update({
        where: { endpoint: data.endpoint },
        data: {
          ...(data.phone != null ? { phone: data.phone.trim() || null } : {}),
          ...(data.email != null
            ? { email: data.email.trim().toLowerCase() || null }
            : {}),
        },
      });

      return NextResponse.json({ subscription: updated });
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        role,
        phone: data.phone?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
      },
      update: {
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        role,
        ...(data.phone != null ? { phone: data.phone.trim() || null } : {}),
        ...(data.email != null
          ? { email: data.email.trim().toLowerCase() || null }
          : {}),
      },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { error: "שגיאה ברישום להתראות" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const endpoint =
      typeof body?.endpoint === "string"
        ? body.endpoint
        : request.nextUrl.searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json({ error: "חסר endpoint" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת מנוי" },
      { status: 500 }
    );
  }
}
