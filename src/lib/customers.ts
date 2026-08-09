import { prisma } from "@/lib/prisma";
import { normalizeIsraeliPhoneLocal, phoneDigits } from "@/lib/phone";

/** Canonical form for matching (972… without leading 0). */
export function normalizePhone(phone: string): string {
  const local = normalizeIsraeliPhoneLocal(phone);
  const digits = phoneDigits(local);
  if (digits.startsWith("0")) {
    return `972${digits.slice(1)}`;
  }
  return digits;
}

export function formatCustomerName(firstName: string, lastName: string): string {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return full || firstName;
}

export function storeFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  return { firstName: fullName.trim(), lastName: "" };
}

type UpsertBookingInput = {
  name: string;
  phone: string;
  email?: string;
};

export async function upsertCustomerFromBooking(input: UpsertBookingInput) {
  const storedPhone = normalizeIsraeliPhoneLocal(input.phone.trim());
  const normalized = normalizePhone(storedPhone);
  const { firstName, lastName } = storeFullName(input.name);
  const email = input.email?.trim() ?? "";

  const existing = await prisma.customer.findFirst({
    where: {
      OR: [{ phone: storedPhone }, { phone: normalized }],
    },
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        firstName,
        lastName,
        phone: storedPhone,
        ...(email ? { email } : {}),
      },
    });
  }

  return prisma.customer.create({
    data: {
      firstName,
      lastName,
      phone: storedPhone,
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

  const digits = phoneDigits(q);
  const isPhoneSearch = digits.length >= 3;
  const normalized = isPhoneSearch ? normalizePhone(q) : null;
  const localQ = isPhoneSearch ? normalizeIsraeliPhoneLocal(q) : null;

  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);

  const phoneClauses: Array<{ phone: { contains: string } }> = [];
  if (isPhoneSearch) {
    phoneClauses.push({ phone: { contains: q } });
    if (localQ && localQ !== q) {
      phoneClauses.push({ phone: { contains: localQ } });
    }
    if (
      normalized &&
      normalized !== q &&
      normalized !== localQ &&
      normalized.length > 0
    ) {
      phoneClauses.push({ phone: { contains: normalized } });
    }
  }

  return prisma.customer.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" as const } },
        { lastName: { contains: q, mode: "insensitive" as const } },
        ...(tokens.length > 1
          ? [
              {
                AND: tokens.map((token) => ({
                  OR: [
                    {
                      firstName: {
                        contains: token,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      lastName: {
                        contains: token,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                })),
              },
            ]
          : []),
        ...phoneClauses,
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: { select: { appointments: true } },
    },
  });
}
