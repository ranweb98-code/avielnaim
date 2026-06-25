"use client";

import { useMemo } from "react";
import { addDays } from "date-fns";
import { cn } from "@/lib/cn";
import {
  formatJerusalemDate,
  getJerusalemDayOfWeek,
  parseJerusalemDate,
} from "@/lib/timezone";

type WorkingHour = {
  dayOfWeek: number;
  isOpen: boolean;
};

type WeekDayStripProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  workingHours: WorkingHour[];
  blockedDates: string[];
  minDate?: string;
  daysToShow?: number;
};

const WEEKDAY_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function isDayDisabled(
  dateStr: string,
  minDate: string,
  workingHours: WorkingHour[],
  blockedDates: string[]
): boolean {
  if (dateStr < minDate) return true;
  if (blockedDates.includes(dateStr)) return true;
  const dayOfWeek = getJerusalemDayOfWeek(dateStr);
  const wh = workingHours.find((w) => w.dayOfWeek === dayOfWeek);
  return !wh?.isOpen;
}

export function WeekDayStrip({
  selectedDate,
  onSelect,
  workingHours,
  blockedDates,
  minDate,
  daysToShow = 14,
}: WeekDayStripProps) {
  const today = minDate ?? formatJerusalemDate();

  const days = useMemo(() => {
    const start = parseJerusalemDate(today);
    return Array.from({ length: daysToShow }, (_, i) =>
      formatJerusalemDate(addDays(start, i))
    );
  }, [today, daysToShow]);

  const showBackToToday = selectedDate !== today;

  return (
    <div className="week-day-strip">
      <div className="week-day-strip__scroll hide-scrollbar">
        {days.map((dateStr) => {
          const disabled = isDayDisabled(
            dateStr,
            today,
            workingHours,
            blockedDates
          );
          const selected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const dayNum = parseJerusalemDate(dateStr).getDate();
          const weekday = WEEKDAY_LETTERS[getJerusalemDayOfWeek(dateStr)];

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(dateStr)}
              className={cn(
                "week-day-strip__day",
                disabled && "week-day-strip__day--disabled",
                selected && "week-day-strip__day--selected",
                isToday && !selected && "week-day-strip__day--today"
              )}
              aria-pressed={selected}
              aria-label={dateStr}
            >
              <span className="week-day-strip__letter">{weekday}</span>
              <span className="week-day-strip__number">{dayNum}</span>
            </button>
          );
        })}
      </div>
      {showBackToToday && (
        <button
          type="button"
          className="week-day-strip__today-btn"
          onClick={() => onSelect(today)}
        >
          חזרה להיום
        </button>
      )}
    </div>
  );
}
