"use client";

import { addDays, format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/cn";

type DateScrollerProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  daysCount?: number;
  startDate?: string;
};

export function DateScroller({
  selectedDate,
  onSelect,
  daysCount = 14,
  startDate,
}: DateScrollerProps) {
  const start = startDate ? parseISO(startDate) : new Date();
  const days = Array.from({ length: daysCount }, (_, i) => addDays(start, i));

  return (
    <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const isSelected = dateStr === selectedDate;
        const dayName = format(day, "EEE", { locale: he });
        const dayNum = format(day, "d");

        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onSelect(dateStr)}
            className={cn("date-pill", isSelected && "date-pill-selected")}
            aria-pressed={isSelected}
          >
            <span className="text-xs">{dayName}</span>
            <span className="mt-1 text-lg font-semibold">{dayNum}</span>
          </button>
        );
      })}
    </div>
  );
}
