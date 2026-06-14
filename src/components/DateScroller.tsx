"use client";

import { addDays } from "date-fns";
import { cn } from "@/lib/cn";
import {
  formatJerusalemDate,
  nowInJerusalem,
  parseJerusalemDate,
} from "@/lib/timezone";

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
  const base = startDate ?? formatJerusalemDate(nowInJerusalem());
  const days = Array.from({ length: daysCount }, (_, i) =>
    formatJerusalemDate(addDays(parseJerusalemDate(base), i))
  );

  return (
    <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
      {days.map((dateStr) => {
        const isSelected = dateStr === selectedDate;
        const day = parseJerusalemDate(dateStr);
        const dayName = new Intl.DateTimeFormat("he-IL", {
          weekday: "short",
          timeZone: "Asia/Jerusalem",
        }).format(day);
        const dayNum = new Intl.DateTimeFormat("he-IL", {
          day: "numeric",
          timeZone: "Asia/Jerusalem",
        }).format(day);

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
