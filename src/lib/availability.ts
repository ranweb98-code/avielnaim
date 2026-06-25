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

export type OccupiedBlock = {
  start: string;
  durationMin: number;
  label?: string;
};

export type DaySchedule = {
  slots: string[];
  occupied: OccupiedBlock[];
  workingHours: { startTime: string; endTime: string } | null;
  slotInterval: number;
  isClosed: boolean;
};

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
  const schedule = await getDaySchedule(date, serviceId);
  return schedule.slots;
}

export async function getDaySchedule(
  date: string,
  serviceId: number,
  options?: { includeOccupiedLabels?: boolean }
): Promise<DaySchedule> {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, active: true },
  });

  if (!service) {
    return {
      slots: [],
      occupied: [],
      workingHours: null,
      slotInterval: DEFAULT_SLOT_INTERVAL,
      isClosed: true,
    };
  }

  const blocked = await prisma.blockedDate.findUnique({
    where: { date },
  });

  if (blocked) {
    return {
      slots: [],
      occupied: [],
      workingHours: null,
      slotInterval: await getSlotInterval(),
      isClosed: true,
    };
  }

  const dayOfWeek = getJerusalemDayOfWeek(date);
  const workingHours = await prisma.workingHours.findUnique({
    where: { dayOfWeek },
  });

  if (!workingHours || !workingHours.isOpen) {
    return {
      slots: [],
      occupied: [],
      workingHours: null,
      slotInterval: await getSlotInterval(),
      isClosed: true,
    };
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

  const occupied: OccupiedBlock[] = appointments.map((appt) => ({
    start: appt.time,
    durationMin: appt.serviceDuration,
    ...(options?.includeOccupiedLabels
      ? { label: `${appt.customerName} · ${appt.serviceName}` }
      : {}),
  }));

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

  return {
    slots: availableSlots,
    occupied,
    workingHours: {
      startTime: workingHours.startTime,
      endTime: workingHours.endTime,
    },
    slotInterval,
    isClosed: false,
  };
}

export async function isSlotAvailable(
  date: string,
  time: string,
  serviceId: number
): Promise<boolean> {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, active: true },
  });

  if (!service) return false;

  const blocked = await prisma.blockedDate.findUnique({ where: { date } });
  if (blocked) return false;

  const dayOfWeek = getJerusalemDayOfWeek(date);
  const workingHours = await prisma.workingHours.findUnique({
    where: { dayOfWeek },
  });

  if (!workingHours || !workingHours.isOpen) return false;

  const start = timeToMinutes(time);
  const end = start + service.durationMin;
  const whStart = timeToMinutes(workingHours.startTime);
  const whEnd = timeToMinutes(workingHours.endTime);

  if (start < whStart || end > whEnd) return false;

  if (isTodayInJerusalem(date)) {
    const minAllowed = getJerusalemTimeMinutes() + MIN_ADVANCE_MINUTES;
    if (start < minAllowed) return false;
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      date,
      status: { in: ["pending", "confirmed"] },
    },
  });

  for (const appt of appointments) {
    const apptStart = timeToMinutes(appt.time);
    const apptEnd = apptStart + appt.serviceDuration;
    if (rangesOverlap(start, end, apptStart, apptEnd)) return false;
  }

  return true;
}
