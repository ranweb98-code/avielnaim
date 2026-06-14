import { prisma } from "@/lib/prisma";
import {
  generateTimeSlots,
  getJerusalemDayOfWeek,
  getJerusalemTimeMinutes,
  isTodayInJerusalem,
  rangesOverlap,
  timeToMinutes,
} from "@/lib/timezone";

const DEFAULT_SLOT_INTERVAL = 30;
const MIN_ADVANCE_MINUTES = 30;

async function getSlotInterval(): Promise<number> {
  const setting = await prisma.setting.findUnique({
    where: { key: "slotInterval" },
  });
  return setting ? parseInt(setting.value, 10) : DEFAULT_SLOT_INTERVAL;
}

export async function getAvailableSlots(
  date: string,
  serviceId: number
): Promise<string[]> {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, active: true },
  });

  if (!service) {
    return [];
  }

  const blocked = await prisma.blockedDate.findUnique({
    where: { date },
  });

  if (blocked) {
    return [];
  }

  const dayOfWeek = getJerusalemDayOfWeek(date);
  const workingHours = await prisma.workingHours.findUnique({
    where: { dayOfWeek },
  });

  if (!workingHours || !workingHours.isOpen) {
    return [];
  }

  const slotInterval = await getSlotInterval();
  const allSlots = generateTimeSlots(
    workingHours.startTime,
    workingHours.endTime,
    slotInterval
  );

  const appointments = await prisma.appointment.findMany({
    where: {
      date,
      status: { in: ["pending", "confirmed"] },
    },
  });

  const serviceDuration = service.durationMin;

  let availableSlots = allSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot);
    const slotEnd = slotStart + serviceDuration;

    for (const appt of appointments) {
      const apptStart = timeToMinutes(appt.time);
      const apptEnd = apptStart + appt.serviceDuration;

      if (rangesOverlap(slotStart, slotEnd, apptStart, apptEnd)) {
        return false;
      }
    }

    return true;
  });

  if (isTodayInJerusalem(date)) {
    const minAllowed = getJerusalemTimeMinutes() + MIN_ADVANCE_MINUTES;

    availableSlots = availableSlots.filter(
      (slot) => timeToMinutes(slot) >= minAllowed
    );
  }

  return availableSlots;
}

export async function isSlotAvailable(
  date: string,
  time: string,
  serviceId: number
): Promise<boolean> {
  const slots = await getAvailableSlots(date, serviceId);
  return slots.includes(time);
}
