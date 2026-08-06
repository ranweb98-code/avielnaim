import { prisma } from "@/lib/prisma";
import { ensureIsraeliLocalPhone } from "@/lib/phone";

async function syncCustomerPhone(
  customerId: number,
  phone: string,
  excludeCustomerId?: number
) {
  const trimmed = ensureIsraeliLocalPhone(phone.trim());
  const duplicate = await prisma.customer.findFirst({
    where: {
      phone: trimmed,
      ...(excludeCustomerId ? { NOT: { id: excludeCustomerId } } : {}),
    },
  });

  if (duplicate) {
    return { error: "מספר טלפון כבר בשימוש על ידי לקוח אחר" as const };
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { phone: trimmed },
  });

  await prisma.appointment.updateMany({
    where: { customerId },
    data: { customerPhone: trimmed },
  });

  return { ok: true as const };
}

export { syncCustomerPhone };
