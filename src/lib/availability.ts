import { prisma } from "@/lib/prisma";
import {
  generateTimeSlots,
  getJerusalemDayOfWeek,
  getJerusalemTimeMinutes,
  isTodayInJerusalem,
  rangesOverlap,
  timeToMinutes,
} from "@/lib/timezone";

import {
  buildOccupiedRanges,
  collectGapStartSlots,
  getMaxFitDurationFromRanges,
  MIN_APPOINTMENT_DURATION,
  type OccupiedRange,
} from "@/lib/scheduling";

const BOOKING_TIME_STEP = 5;
const MIN_ADVANCE_MINUTES = 30;

export { BOOKING_TIME_STEP, MIN_APPOINTMENT_DURATION };
export type { OccupiedRange } from "@/lib/scheduling";
export { findGapStartAt } from "@/lib/scheduling";

export type OccupiedBlock = {
  start: string;
  durationMin: number;
  label?: string;
  blocked?: boolean;
};

async function getBlockedTimeSlots(date: string) {
  return prisma.blockedTimeSlot.findMany({
    where: { date },
    orderBy: { startTime: "asc" },
  });
}

function slotOverlapsBlockedRange(
  slotStart: number,
  slotEnd: number,
  blockedRanges: Array<{ startTime: string; endTime: string }>
): boolean {
  for (const block of blockedRanges) {
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);
    if (rangesOverlap(slotStart, slotEnd, blockStart, blockEnd)) {
      return true;
    }
  }
  return false;
}

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

  const blockedSlots = await getBlockedTimeSlots(date);

  const serviceDuration = service.durationMin;

  const occupied: OccupiedBlock[] = [
    ...appointments.map((appt) => ({
      start: appt.time,
      durationMin: appt.serviceDuration,
      ...(options?.includeOccupiedLabels
        ? { label: `${appt.customerName} · ${appt.serviceName}` }
        : {}),
    })),
    ...blockedSlots.map((block) => ({
      start: block.startTime,
      durationMin: timeToMinutes(block.endTime) - timeToMinutes(block.startTime),
      blocked: true,
      ...(options?.includeOccupiedLabels
        ? { label: block.reason ? `חסום · ${block.reason}` : "חסום" }
        : {}),
    })),
  ];

  let availableSlots = allSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot);
    const slotEnd = slotStart + serviceDuration;

    if (slotOverlapsBlockedRange(slotStart, slotEnd, blockedSlots)) {
      return false;
    }

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

  const blockedSlots = await getBlockedTimeSlots(date);
  if (slotOverlapsBlockedRange(start, end, blockedSlots)) return false;

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

type DayContext = {
  whStart: number;
  whEnd: number;
  appointments: Array<{ id: number; time: string; serviceDuration: number }>;
  blockedSlots: Array<{ startTime: string; endTime: string }>;
};

async function getDayContext(
  date: string,
  options?: { excludeAppointmentId?: number }
): Promise<DayContext | null> {
  const blocked = await prisma.blockedDate.findUnique({ where: { date } });
  if (blocked) return null;

  const dayOfWeek = getJerusalemDayOfWeek(date);
  const workingHours = await prisma.workingHours.findUnique({
    where: { dayOfWeek },
  });

  if (!workingHours || !workingHours.isOpen) return null;

  const appointments = await prisma.appointment.findMany({
    where: {
      date,
      status: { in: ["pending", "confirmed"] },
      ...(options?.excludeAppointmentId
        ? { id: { not: options.excludeAppointmentId } }
        : {}),
    },
  });

  const blockedSlots = await getBlockedTimeSlots(date);

  return {
    whStart: timeToMinutes(workingHours.startTime),
    whEnd: timeToMinutes(workingHours.endTime),
    appointments,
    blockedSlots,
  };
}

function getMaxFitDurationFromContext(
  startMinutes: number,
  ctx: DayContext
): number {
  if (startMinutes < ctx.whStart || startMinutes >= ctx.whEnd) return 0;

  const occupied = buildOccupiedRangesFromContext(ctx);
  return getMaxFitDurationFromRanges(startMinutes, ctx.whEnd, occupied);
}

function buildOccupiedRangesFromContext(ctx: DayContext): OccupiedRange[] {
  return buildOccupiedRanges(
    ctx.whStart,
    ctx.whEnd,
    ctx.appointments,
    ctx.blockedSlots
  );
}

export async function getMaxFitDuration(
  date: string,
  time: string,
  serviceId: number,
  options?: { excludeAppointmentId?: number }
): Promise<number> {
  const ctx = await getDayContext(date, options);
  if (!ctx) return 0;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, active: true },
  });
  if (!service) return 0;

  return getMaxFitDurationFromContext(timeToMinutes(time), ctx);
}

export async function getAdminSlotFit(
  date: string,
  time: string,
  serviceId: number,
  options?: { excludeAppointmentId?: number }
): Promise<{
  maxFitDuration: number;
  catalogDuration: number;
  fitsFully: boolean;
} | null> {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, active: true },
  });
  if (!service) return null;

  const maxFitDuration = await getMaxFitDuration(date, time, serviceId, options);
  return {
    maxFitDuration,
    catalogDuration: service.durationMin,
    fitsFully: maxFitDuration >= service.durationMin,
  };
}

export async function isAdminSlotAvailable(
  date: string,
  time: string,
  serviceId: number,
  duration: number,
  options?: { excludeAppointmentId?: number }
): Promise<boolean> {
  const ctx = await getDayContext(date, options);
  if (!ctx) return false;

  const start = timeToMinutes(time);
  const end = start + duration;

  if (start < ctx.whStart || end > ctx.whEnd) return false;
  if (duration < MIN_APPOINTMENT_DURATION) return false;

  if (slotOverlapsBlockedRange(start, end, ctx.blockedSlots)) return false;

  for (const appt of ctx.appointments) {
    const apptStart = timeToMinutes(appt.time);
    const apptEnd = apptStart + appt.serviceDuration;
    if (rangesOverlap(start, end, apptStart, apptEnd)) return false;
  }

  const maxFit = getMaxFitDurationFromContext(start, ctx);
  return duration <= maxFit;
}

function collectAdminGapStartSlots(ctx: DayContext, minDuration: number): string[] {
  const occupied = buildOccupiedRangesFromContext(ctx);
  return collectGapStartSlots(ctx.whStart, ctx.whEnd, occupied, minDuration);
}

export async function getAdminDaySchedule(
  date: string,
  serviceId: number,
  options?: { includeOccupiedLabels?: boolean }
): Promise<DaySchedule> {
  const base = await getDaySchedule(date, serviceId, options);
  if (base.isClosed || !base.workingHours) return base;

  const ctx = await getDayContext(date);
  if (!ctx) return base;

  const gapStarts = collectAdminGapStartSlots(ctx, MIN_APPOINTMENT_DURATION);

  const merged = [...new Set([...base.slots, ...gapStarts])].sort(
    (a, b) => timeToMinutes(a) - timeToMinutes(b)
  );

  return { ...base, slots: merged };
}
