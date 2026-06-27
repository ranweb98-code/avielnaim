"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
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
  allowPastDates?: boolean;
  restrictAvailability?: boolean;
  anchorToSelected?: boolean;
  /** Always include calendar today at the start of the strip (admin). */
  anchorToToday?: boolean;
  /** Hide dates before calendar today in the strip. */
  hidePastDates?: boolean;
  /** Show closed days as selectable with red styling (admin). */
  markClosedDays?: boolean;
  variant?: "default" | "calmark";
  highlightDates?: string[];
  /** Jump target for the shortcut button (defaults to calendar today). */
  homeDate?: string;
  homeDateLabel?: string;
  /** Rendered below the day scroll (e.g. calendar picker). */
  afterDays?: ReactNode;
};

const WEEKDAY_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function isDayClosed(
  dateStr: string,
  workingHours: WorkingHour[],
  blockedDates: string[]
): boolean {
  if (blockedDates.includes(dateStr)) return true;
  const dayOfWeek = getJerusalemDayOfWeek(dateStr);
  const wh = workingHours.find((w) => w.dayOfWeek === dayOfWeek);
  return !wh?.isOpen;
}

function isDayDisabled(
  dateStr: string,
  minDate: string,
  workingHours: WorkingHour[],
  blockedDates: string[],
  allowPastDates: boolean,
  restrictAvailability: boolean
): boolean {
  if (!allowPastDates && dateStr < minDate) return true;
  if (!restrictAvailability) return false;
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
  allowPastDates = false,
  restrictAvailability = true,
  anchorToSelected = false,
  anchorToToday = false,
  hidePastDates = false,
  markClosedDays = false,
  variant = "default",
  highlightDates = [],
  homeDate,
  homeDateLabel,
  afterDays,
}: WeekDayStripProps) {
  const today = minDate ?? formatJerusalemDate();
  const jumpDate = homeDate ?? today;
  const highlightSet = useMemo(() => new Set(highlightDates), [highlightDates]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    if (anchorToToday) {
      const start = parseJerusalemDate(today);
      const selected = parseJerusalemDate(selectedDate);
      const end = addDays(selected, 7);
      const span = Math.max(
        daysToShow,
        Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
      );
      const allDays = Array.from({ length: span }, (_, i) =>
        formatJerusalemDate(addDays(start, i))
      );
      return hidePastDates ? allDays.filter((d) => d >= today) : allDays;
    }

    if (anchorToSelected) {
      const start = addDays(parseJerusalemDate(selectedDate), -3);
      return Array.from({ length: daysToShow }, (_, i) =>
        formatJerusalemDate(addDays(start, i))
      );
    }

    return Array.from({ length: daysToShow }, (_, i) =>
      formatJerusalemDate(addDays(parseJerusalemDate(today), i))
    );
  }, [today, daysToShow, anchorToSelected, anchorToToday, hidePastDates, selectedDate]);

  useEffect(() => {
    if (!anchorToToday || !scrollRef.current) return;

    const container = scrollRef.current;
    const selectedButton = container.querySelector<HTMLButtonElement>(
      `[data-date="${selectedDate}"]`
    );
    if (!selectedButton) return;

    selectedButton.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    });
  }, [anchorToToday, selectedDate, days.length]);

  const showBackToToday = selectedDate !== jumpDate;
  const backLabel =
    homeDateLabel ??
    (jumpDate === today ? "חזרה להיום" : "חזרה ליום הקרוב");

  return (
    <div className={cn("week-day-strip", variant === "calmark" && "week-day-strip--calmark")}>
      <div ref={scrollRef} className="week-day-strip__scroll hide-scrollbar">
        {days.map((dateStr) => {
          const disabled = isDayDisabled(
            dateStr,
            today,
            workingHours,
            blockedDates,
            allowPastDates,
            restrictAvailability
          );
          const closed =
            markClosedDays &&
            workingHours.length > 0 &&
            isDayClosed(dateStr, workingHours, blockedDates);
          const selected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const hasAppointments = highlightSet.has(dateStr);
          const dayNum = parseJerusalemDate(dateStr).getDate();
          const weekday = WEEKDAY_LETTERS[getJerusalemDayOfWeek(dateStr)];

          return (
            <button
              key={dateStr}
              type="button"
              data-date={dateStr}
              disabled={disabled}
              onClick={() => !disabled && onSelect(dateStr)}
              className={cn(
                "week-day-strip__day",
                disabled && "week-day-strip__day--disabled",
                closed && "week-day-strip__day--closed",
                closed && isToday && "week-day-strip__day--closed-today",
                hasAppointments && "week-day-strip__day--has-appointments",
                selected && "week-day-strip__day--selected",
                variant === "calmark" && selected && "week-day-strip__day--calmark-selected",
                isToday && !selected && !closed && "week-day-strip__day--today"
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
      {(afterDays || showBackToToday) && (
        <div className="week-day-strip__footer">
          {afterDays}
          {showBackToToday && (
            <button
              type="button"
              className="week-day-strip__today-btn"
              onClick={() => onSelect(jumpDate)}
            >
              {backLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
