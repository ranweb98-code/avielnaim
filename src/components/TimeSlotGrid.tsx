import { cn } from "@/lib/cn";

type TimeSlotGridProps = {
  slots: string[];
  selectedTime: string;
  onSelect: (time: string) => void;
  loading?: boolean;
};

export function TimeSlotGrid({
  slots,
  selectedTime,
  onSelect,
  loading,
}: TimeSlotGridProps) {
  if (loading) {
    return (
      <div className="time-scroll hide-scrollbar">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="time-pill animate-pulse bg-bg-card-hover"
            aria-hidden
          />
        ))}
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
    <div className="time-scroll hide-scrollbar">
      {slots.map((slot) => {
        const isSelected = slot === selectedTime;
        return (
          <button
            key={slot}
            type="button"
            onClick={() => onSelect(slot)}
            className={cn("time-pill", isSelected && "time-pill-selected")}
            aria-pressed={isSelected}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}
