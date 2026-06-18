"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { he } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

type CalendarPickerProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  workingHours: WorkingHour[];
  blockedDates: string[];
  minDate?: string;
};

const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

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

export function CalendarPicker({
  selectedDate,
  onSelect,
  workingHours,
  blockedDates,
  minDate,
}: CalendarPickerProps) {
  const today = minDate ?? formatJerusalemDate();
  const initialMonth = selectedDate
    ? parseJerusalemDate(selectedDate)
    : parseJerusalemDate(today);

  const [viewMonth, setViewMonth] = useState(initialMonth);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const startPad = getJerusalemDayOfWeek(formatJerusalemDate(monthStart));

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const monthLabel = format(viewMonth, "MMMM yyyy", { locale: he });

  const cells = useMemo(() => {
    const result: (string | null)[] = [];
    for (let i = 0; i < startPad; i++) result.push(null);
    for (const day of daysInMonth) {
      result.push(formatJerusalemDate(day));
    }
    return result;
  }, [daysInMonth, startPad]);

  return (
    <div className="calendar-picker">
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="חודש הבא"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <span className="calendar-month-title">{monthLabel}</span>
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          aria-label="חודש קודם"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d} className="calendar-weekday">
            {d}
          </span>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((dateStr, i) => {
          if (!dateStr) {
            return <div key={`empty-${i}`} className="calendar-day calendar-day--empty" />;
          }

          const disabled = isDayDisabled(
            dateStr,
            today,
            workingHours,
            blockedDates
          );
          const selected = dateStr === selectedDate;
          const dayNum = parseJerusalemDate(dateStr).getDate();

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(dateStr)}
              className={cn(
                "calendar-day",
                disabled && "calendar-day--disabled",
                !disabled && !selected && "calendar-day--available",
                selected && "calendar-day--selected"
              )}
              aria-pressed={selected}
              aria-label={dateStr}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}
