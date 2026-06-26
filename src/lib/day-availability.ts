import { addDays } from "date-fns";
import {
  formatJerusalemDate,
  getJerusalemDayOfWeek,
  minutesToTime,
  parseJerusalemDate,
  timeToMinutes,
} from "@/lib/timezone";

type DayAvailabilityHour = {
  dayOfWeek: number;
  isOpen: boolean;
};

export function isWorkingDay(
  dateStr: string,
  workingHours: DayAvailabilityHour[],
  blockedDates: string[]
): boolean {
  if (blockedDates.includes(dateStr)) return false;
  const dayOfWeek = getJerusalemDayOfWeek(dateStr);
  const wh = workingHours.find((w) => w.dayOfWeek === dayOfWeek);
  return !!wh?.isOpen;
}

export function findNextOpenDay(
  fromDate: string,
  workingHours: DayAvailabilityHour[],
  blockedDates: string[],
  maxDays = 60
): string {
  let current = fromDate;
  for (let i = 0; i < maxDays; i++) {
    if (isWorkingDay(current, workingHours, blockedDates)) return current;
    current = formatJerusalemDate(addDays(parseJerusalemDate(current), 1));
  }
  return fromDate;
}

export function deriveHoursFromAppointments(
  appointments: { time: string; serviceDuration: number }[]
): { startTime: string; endTime: string } | null {
  if (appointments.length === 0) return null;

  let start = Infinity;
  let end = 0;
  for (const appt of appointments) {
    const apptStart = timeToMinutes(appt.time);
    const apptEnd = apptStart + appt.serviceDuration;
    start = Math.min(start, apptStart);
    end = Math.max(end, apptEnd);
  }

  const paddedStart = Math.max(0, start - 60);
  const paddedEnd = Math.min(24 * 60, end + 60);
  return {
    startTime: minutesToTime(paddedStart),
    endTime: minutesToTime(paddedEnd),
  };
}
