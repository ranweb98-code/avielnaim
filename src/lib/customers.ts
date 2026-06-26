import { prisma } from "@/lib/prisma";

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()+]/g, "").replace(/^0/, "972");
}

export function splitFullName(name: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: trimmed, lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function formatCustomerName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

type UpsertBookingInput = {
  name: string;
  phone: string;
  email?: string;
};

export async function upsertCustomerFromBooking(input: UpsertBookingInput) {
  const normalized = normalizePhone(input.phone);
  const { firstName, lastName } = splitFullName(input.name);
  const email = input.email?.trim() ?? "";

  const existing = await prisma.customer.findFirst({
    where: {
      OR: [{ phone: input.phone }, { phone: normalized }],
    },
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        firstName,
        lastName,
        phone: input.phone.trim(),
        ...(email ? { email } : {}),
      },
    });
  }

  return prisma.customer.create({
    data: {
      firstName,
      lastName,
      phone: input.phone.trim(),
      email,
    },
  });
}

export async function backfillCustomersFromAppointments() {
  const appointments = await prisma.appointment.findMany({
    where: { customerId: null },
    orderBy: { createdAt: "asc" },
  });

  let linked = 0;

  for (const appt of appointments) {
    const customer = await upsertCustomerFromBooking({
      name: appt.customerName,
      phone: appt.customerPhone,
      email: appt.customerEmail || undefined,
    });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { customerId: customer.id },
    });
    linked++;
  }

  return { linked };
}

export async function searchCustomers(query: string) {
  const q = query.trim();
  if (!q) {
    return prisma.customer.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        _count: { select: { appointments: true } },
      },
    });
  }

  const normalized = normalizePhone(q);

  return prisma.customer.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        ...(normalized !== q ? [{ phone: { contains: normalized } }] : []),
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: { select: { appointments: true } },
    },
  });
}
