import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { addMinutes, format, parseISO, startOfDay } from "date-fns";

export const JERUSALEM_TZ = "Asia/Jerusalem";

export function nowInJerusalem(): Date {
  return toZonedTime(new Date(), JERUSALEM_TZ);
}

export function formatJerusalemDate(date: Date, pattern = "yyyy-MM-dd"): string {
  return formatInTimeZone(date, JERUSALEM_TZ, pattern);
}

export function parseJerusalemDate(dateStr: string): Date {
  return fromZonedTime(parseISO(`${dateStr}T00:00:00`), JERUSALEM_TZ);
}

export function parseJerusalemDateTime(dateStr: string, timeStr: string): Date {
  return fromZonedTime(parseISO(`${dateStr}T${timeStr}:00`), JERUSALEM_TZ);
}

export function getJerusalemDayOfWeek(dateStr: string): number {
  return parseJerusalemDate(dateStr).getDay();
}

export function isTodayInJerusalem(dateStr: string): boolean {
  return dateStr === formatJerusalemDate(nowInJerusalem());
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMin: number
): string[] {
  const slots: string[] = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  while (current + intervalMin <= end) {
    slots.push(minutesToTime(current));
    current += intervalMin;
  }

  return slots;
}

export function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && startB < endA;
}

export { addMinutes, format, startOfDay };
