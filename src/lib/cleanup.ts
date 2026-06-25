import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatJerusalemDate } from "@/lib/timezone";

/**
 * Deletes appointments whose date is more than a week in the past.
 * Dates are stored as "yyyy-MM-dd" strings, so lexicographic comparison
 * matches chronological order.
 */
export async function deleteOldAppointments(): Promise<number> {
  const cutoff = formatJerusalemDate(subDays(new Date(), 7));

  const { count } = await prisma.appointment.deleteMany({
    where: { date: { lt: cutoff } },
  });

  return count;
}
