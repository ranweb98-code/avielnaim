"use client";

import { useCallback, useMemo, useRef } from "react";
import type { OccupiedBlock } from "@/lib/availability";
import {
  formatJerusalemDate,
  getJerusalemTimeMinutes,
  isTodayInJerusalem,
  minutesToTime,
  rangesOverlap,
  timeToMinutes,
} from "@/lib/timezone";

type DayScheduleGridProps = {
  date: string;
  selectedTime: string;
  onSelect: (time: string) => void;
  occupied: OccupiedBlock[];
  workingHours: { startTime: string; endTime: string } | null;
  serviceDurationMin: number;
  isClosed: boolean;
  slotInterval?: number;
  loading?: boolean;
};

const PX_PER_MINUTE = 2;
const MIN_ADVANCE_MINUTES = 30;

function clampMinutes(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DayScheduleGrid({
  date,
  selectedTime,
  onSelect,
  occupied,
  workingHours,
  serviceDurationMin,
  isClosed,
  slotInterval = 5,
  loading,
}: DayScheduleGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const today = formatJerusalemDate();
  const isToday = isTodayInJerusalem(date);
  const nowMinutes = isToday ? getJerusalemTimeMinutes() : null;

  const { startMinutes, endMinutes, totalMinutes, totalHeight } = useMemo(() => {
    if (!workingHours) {
      return { startMinutes: 0, endMinutes: 0, totalMinutes: 0, totalHeight: 0 };
    }
    const start = timeToMinutes(workingHours.startTime);
    const end = timeToMinutes(workingHours.endTime);
    const total = end - start;
    return {
      startMinutes: start,
      endMinutes: end,
      totalMinutes: total,
      totalHeight: total * PX_PER_MINUTE,
    };
  }, [workingHours]);

  const hourLabels = useMemo(() => {
    if (!workingHours) return [];
    const labels: { minutes: number; label: string }[] = [];
    for (let m = startMinutes; m < endMinutes; m += 60) {
      labels.push({ minutes: m, label: minutesToTime(m) });
    }
    return labels;
  }, [workingHours, startMinutes, endMinutes]);

  const intervalLines = useMemo(() => {
    if (!workingHours) return [];
    const lines: number[] = [];
    for (let m = startMinutes; m < endMinutes; m += slotInterval) {
      if (m % 60 !== 0) lines.push(m);
    }
    return lines;
  }, [workingHours, startMinutes, endMinutes, slotInterval]);

  const isTimeSelectable = useCallback(
    (time: string) => {
      if (!workingHours) return false;
      const start = timeToMinutes(time);
      const end = start + serviceDurationMin;

      if (start < startMinutes || end > endMinutes) return false;
      if (start % slotInterval !== 0) return false;

      if (isToday && nowMinutes !== null) {
        if (start < nowMinutes + MIN_ADVANCE_MINUTES) return false;
      }

      for (const block of occupied) {
        const blockStart = timeToMinutes(block.start);
        const blockEnd = blockStart + block.durationMin;
        if (rangesOverlap(start, end, blockStart, blockEnd)) return false;
      }

      return true;
    },
    [
      workingHours,
      serviceDurationMin,
      startMinutes,
      endMinutes,
      isToday,
      nowMinutes,
      occupied,
      slotInterval,
    ]
  );

  const handleGridPointer = useCallback(
    (clientY: number) => {
      if (!gridRef.current || !workingHours || totalMinutes <= 0) return;

      const rect = gridRef.current.getBoundingClientRect();
      const y = clampMinutes(clientY - rect.top, 0, rect.height);
      const ratio = y / rect.height;
      const clickedMinute = startMinutes + ratio * totalMinutes;
      const rounded =
        Math.round(clickedMinute / slotInterval) * slotInterval;

      const maxStart = endMinutes - serviceDurationMin;
      const clampedStart = clampMinutes(rounded, startMinutes, maxStart);
      const time = minutesToTime(clampedStart);

      if (isTimeSelectable(time)) {
        onSelect(time);
      }
    },
    [
      workingHours,
      totalMinutes,
      startMinutes,
      endMinutes,
      serviceDurationMin,
      slotInterval,
      isTimeSelectable,
      onSelect,
    ]
  );

  if (loading) {
    return (
      <div className="gcal-grid gcal-grid--loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="gcal-grid__skeleton" />
        ))}
      </div>
    );
  }

  if (isClosed || !workingHours) {
    return (
      <div className="gcal-grid gcal-grid--closed">
        <p className="text-center text-sm text-text-secondary">
          אין שעות פנויות לתאריך זה
        </p>
      </div>
    );
  }

  return (
    <div className="gcal-grid">
      <p className="gcal-grid__hint">
        לחץ על הזמן הרצוי — בחירה במרווחים של {slotInterval} דקות, התור נמשך {serviceDurationMin} דקות
      </p>
      <div className="gcal-grid__container">
        <div
          ref={gridRef}
          className="gcal-grid__canvas"
          style={{ height: totalHeight }}
          role="grid"
          aria-label="בחירת שעה"
          onClick={(e) => handleGridPointer(e.clientY)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              const rect = gridRef.current?.getBoundingClientRect();
              if (rect) handleGridPointer(rect.top + rect.height / 2);
            }
          }}
          tabIndex={0}
        >
          {hourLabels.map(({ minutes, label }) => (
            <div
              key={label}
              className="gcal-grid__hour-line"
              style={{ top: (minutes - startMinutes) * PX_PER_MINUTE }}
            >
              <span className="gcal-grid__hour-label">{label}</span>
            </div>
          ))}

          {intervalLines.map((minutes) => (
            <div
              key={minutes}
              className="gcal-grid__interval-line"
              style={{ top: (minutes - startMinutes) * PX_PER_MINUTE }}
            />
          ))}

          {isToday && nowMinutes !== null && nowMinutes >= startMinutes && (
            <div
              className="gcal-grid__now-line"
              style={{ top: (nowMinutes - startMinutes) * PX_PER_MINUTE }}
            />
          )}

          {occupied.map((block, i) => {
            const top = (timeToMinutes(block.start) - startMinutes) * PX_PER_MINUTE;
            const height = block.durationMin * PX_PER_MINUTE;
            return (
              <div
                key={`${block.start}-${i}`}
                className="gcal-grid__event"
                style={{ top, height }}
              >
                <span className="gcal-grid__event-label">
                  {block.label ?? "תפוס"}
                </span>
              </div>
            );
          })}

          {selectedTime && isTimeSelectable(selectedTime) && (
            <div
              className="gcal-grid__selection"
              style={{
                top:
                  (timeToMinutes(selectedTime) - startMinutes) * PX_PER_MINUTE,
                height: serviceDurationMin * PX_PER_MINUTE,
              }}
            >
              <span className="gcal-grid__selection-label">{selectedTime}</span>
            </div>
          )}
        </div>
      </div>
      {selectedTime && (
        <p className="gcal-grid__selected">
          נבחר: <strong>{selectedTime}</strong>
          {date === today ? " · היום" : ` · ${date}`}
          {" · "}
          {serviceDurationMin} דק&apos;
        </p>
      )}
    </div>
  );
}
