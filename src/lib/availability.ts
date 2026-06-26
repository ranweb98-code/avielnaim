import { prisma } from "@/lib/prisma";
import {
  generateTimeSlots,
  getJerusalemDayOfWeek,
  getJerusalemTimeMinutes,
  isTodayInJerusalem,
  rangesOverlap,
  timeToMinutes,
} from "@/lib/timezone";

const BOOKING_TIME_STEP = 5;
const MIN_ADVANCE_MINUTES = 30;

export { BOOKING_TIME_STEP };

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

async function getBookingTimeStep(): Promise<number> {
  return BOOKING_TIME_STEP;
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
      slotInterval: BOOKING_TIME_STEP,
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
      slotInterval: BOOKING_TIME_STEP,
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
      slotInterval: BOOKING_TIME_STEP,
      isClosed: true,
    };
  }

  const timeStep = await getBookingTimeStep();
  const allSlots = generateTimeSlots(
    workingHours.startTime,
    workingHours.endTime,
    timeStep
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
    slotInterval: timeStep,
    isClosed: false,
  };
}

export async function isSlotAvailable(
  date: string,
  time: string,
  serviceId: number,
  options?: { excludeAppointmentId?: number; skipAdvanceCheck?: boolean }
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

  const timeStep = await getBookingTimeStep();
  if (start % timeStep !== 0) return false;

  if (isTodayInJerusalem(date) && !options?.skipAdvanceCheck) {
    const minAllowed = getJerusalemTimeMinutes() + MIN_ADVANCE_MINUTES;
    if (start < minAllowed) return false;
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      date,
      status: { in: ["pending", "confirmed"] },
      ...(options?.excludeAppointmentId
        ? { id: { not: options.excludeAppointmentId } }
        : {}),
    },
  });

  for (const appt of appointments) {
    const apptStart = timeToMinutes(appt.time);
    const apptEnd = apptStart + appt.serviceDuration;
    if (rangesOverlap(start, end, apptStart, apptEnd)) return false;
  }

  return true;
}
