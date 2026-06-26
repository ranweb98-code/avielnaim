"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { he } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarPicker } from "@/components/CalendarPicker";
import { cn } from "@/lib/cn";
import {
  formatJerusalemDate,
  parseJerusalemDate,
} from "@/lib/timezone";

type WorkingHour = {
  dayOfWeek: number;
  isOpen: boolean;
};

type DatePickerBarProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  workingHours?: WorkingHour[];
  blockedDates?: string[];
  minDate?: string;
  restrictAvailability?: boolean;
  allowPastDates?: boolean;
  className?: string;
  compact?: boolean;
};

export function DatePickerBar({
  selectedDate,
  onSelect,
  workingHours = [],
  blockedDates = [],
  minDate,
  restrictAvailability = true,
  allowPastDates = false,
  className,
  compact = false,
}: DatePickerBarProps) {
  const today = formatJerusalemDate();
  const effectiveMinDate = allowPastDates ? "1970-01-01" : (minDate ?? today);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedLabel = format(parseJerusalemDate(selectedDate), "EEEE, d MMMM yyyy", {
    locale: he,
  });

  const showTodayShortcut = selectedDate !== today;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function shiftDay(delta: number) {
    const next = formatJerusalemDate(
      addDays(parseJerusalemDate(selectedDate), delta)
    );
    if (!allowPastDates && next < today) return;
    onSelect(next);
  }

  return (
    <div className={cn("date-picker-bar", compact && "date-picker-bar--compact", className)}>
      <div className={cn("date-picker-bar__controls", compact && "date-picker-bar__controls--compact")}>
        {!compact && (
          <button
            type="button"
            className="date-picker-bar__nav-btn"
            onClick={() => shiftDay(-1)}
            disabled={!allowPastDates && selectedDate <= today}
            aria-label="יום קודם"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div className="date-picker-bar__center" ref={popoverRef}>
          <button
            type="button"
            className={cn(
              "date-picker-bar__date-btn",
              compact && "date-picker-bar__date-btn--icon-only"
            )}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label={compact ? "פתיחת לוח שנה" : undefined}
          >
            <Calendar className={cn("shrink-0", compact ? "h-5 w-5" : "h-4 w-4 text-accent-yellow")} />
            {!compact && (
              <span className="date-picker-bar__date-label">{selectedLabel}</span>
            )}
          </button>

          {open && (
            <div
              className={cn(
                "date-picker-bar__popover",
                compact && "date-picker-bar__popover--compact"
              )}
              role="dialog"
              aria-label="בחירת תאריך"
            >
              <CalendarPicker
                selectedDate={selectedDate}
                onSelect={(date) => {
                  onSelect(date);
                  setOpen(false);
                }}
                workingHours={workingHours}
                blockedDates={blockedDates}
                minDate={effectiveMinDate}
                availabilityMode={restrictAvailability ? "strict" : "none"}
              />
            </div>
          )}
        </div>

        {!compact && (
          <button
            type="button"
            className="date-picker-bar__nav-btn"
            onClick={() => shiftDay(1)}
            aria-label="יום הבא"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {!compact && showTodayShortcut && (
        <button
          type="button"
          className="date-picker-bar__today-btn"
          onClick={() => onSelect(today)}
        >
          חזרה להיום
        </button>
      )}
    </div>
  );
}
