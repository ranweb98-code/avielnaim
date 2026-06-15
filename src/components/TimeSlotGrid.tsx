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
      <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 6 }).map((_, i) => (
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
    <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
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
