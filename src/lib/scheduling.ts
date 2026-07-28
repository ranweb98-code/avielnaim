import { minutesToTime, timeToMinutes } from "@/lib/timezone";

export type OccupiedRange = {
  start: number;
  end: number;
};

export const MIN_APPOINTMENT_DURATION = 5;

export function buildOccupiedRanges(
  whStart: number,
  whEnd: number,
  appointments: Array<{ time: string; serviceDuration: number }>,
  blockedSlots: Array<{ startTime: string; endTime: string }>,
  minStart?: number
): OccupiedRange[] {
  const ranges: OccupiedRange[] = [];

  for (const appt of appointments) {
    const apptStart = timeToMinutes(appt.time);
    ranges.push({
      start: apptStart,
      end: apptStart + appt.serviceDuration,
    });
  }

  for (const block of blockedSlots) {
    ranges.push({
      start: timeToMinutes(block.startTime),
      end: timeToMinutes(block.endTime),
    });
  }

  ranges.sort((a, b) => a.start - b.start);

  if (minStart !== undefined && minStart > whStart) {
    return [{ start: whStart, end: minStart }, ...ranges];
  }

  return ranges;
}

/** Returns the start of the gap containing `minutes`, or null if inside an occupied range. */
export function findGapStartAt(
  minutes: number,
  occupiedRanges: OccupiedRange[],
  whStart: number,
  whEnd: number
): number | null {
  if (minutes < whStart || minutes >= whEnd) return null;

  const sorted = [...occupiedRanges].sort((a, b) => a.start - b.start);

  let gapStart = whStart;
  for (const range of sorted) {
    if (minutes < range.start) {
      if (minutes >= gapStart) return gapStart;
      return null;
    }
    if (minutes >= range.start && minutes < range.end) return null;
    gapStart = Math.max(gapStart, range.end);
  }

  if (minutes >= gapStart && minutes < whEnd) return gapStart;
  return null;
}

export function getMaxFitDurationFromRanges(
  startMinutes: number,
  whEnd: number,
  occupiedRanges: OccupiedRange[]
): number {
  if (startMinutes >= whEnd) return 0;

  let nextObstacle = whEnd;
  for (const range of occupiedRanges) {
    if (range.start > startMinutes) {
      nextObstacle = Math.min(nextObstacle, range.start);
    }
  }

  return Math.max(0, nextObstacle - startMinutes);
}

export function collectGapStartSlots(
  whStart: number,
  whEnd: number,
  occupiedRanges: OccupiedRange[],
  minDuration: number
): string[] {
  const sorted = [...occupiedRanges].sort((a, b) => a.start - b.start);
  const gapStarts: string[] = [];
  let cursor = whStart;

  for (const range of sorted) {
    if (range.end <= cursor) continue;
    if (range.start > cursor) {
      const gapSize = range.start - cursor;
      if (gapSize >= minDuration) {
        gapStarts.push(minutesToTime(cursor));
      }
    }
    cursor = Math.max(cursor, range.end);
  }

  if (whEnd - cursor >= minDuration) {
    gapStarts.push(minutesToTime(cursor));
  }

  return gapStarts;
}
