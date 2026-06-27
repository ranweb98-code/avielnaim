"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type TimeSlotListPickerProps = {
  slots: string[];
  selectedTime: string;
  onSelect: (time: string) => void;
  loading?: boolean;
};

export function TimeSlotListPicker({
  slots,
  selectedTime,
  onSelect,
  loading,
}: TimeSlotListPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !selectedRef.current) return;
    selectedRef.current.scrollIntoView({ block: "center" });
  }, [open, selectedTime, slots.length]);

  if (loading) {
    return (
      <div className="time-slot-list-picker">
        <div className="time-slot-list-picker__field animate-pulse bg-bg-card-hover" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-secondary">
        אין שעות פנויות לתאריך זה
      </p>
    );
  }

  return (
    <div ref={rootRef} className="time-slot-list-picker">
      <button
        type="button"
        className={cn(
          "time-slot-list-picker__field",
          open && "time-slot-list-picker__field--open"
        )}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="time-slot-list-picker__value">
          {selectedTime || "בחר שעה"}
        </span>
        <ChevronDown
          className={cn(
            "time-slot-list-picker__chevron",
            open && "time-slot-list-picker__chevron--open"
          )}
        />
      </button>

      {open && (
        <div className="time-slot-list-picker__menu" role="listbox">
          {slots.map((slot) => {
            const isSelected = slot === selectedTime;
            return (
              <button
                key={slot}
                ref={isSelected ? selectedRef : undefined}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "time-slot-list-picker__option",
                  isSelected && "time-slot-list-picker__option--selected"
                )}
                onClick={() => {
                  onSelect(slot);
                  setOpen(false);
                }}
              >
                <span dir="ltr">{slot}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
