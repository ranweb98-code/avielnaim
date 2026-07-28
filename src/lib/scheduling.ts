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

/**
 * Resolve a calendar click to a bookable start time.
 * Default: snap to the grid step at the click position.
 * Special case: if the click is within `step` minutes after a previous
 * appointment/block ends, snap to that end so booking can start immediately after.
 */
export function resolveBookableClickMinutes(
  rawMinutes: number,
  occupiedRanges: OccupiedRange[],
  whStart: number,
  whEnd: number,
  step: number
): number {
  const snapped = Math.round(rawMinutes / step) * step;
  const clamped = Math.max(whStart, Math.min(whEnd - step, snapped));

  const gapStart = findGapStartAt(
    rawMinutes,
    occupiedRanges,
    whStart,
    whEnd
  );
  if (gapStart === null) return clamped;

  // Only "stick" to the previous appointment end when the click is near it.
  // Otherwise a long empty morning would always select opening time.
  if (rawMinutes - gapStart <= step) {
    return gapStart;
  }

  return clamped;
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
