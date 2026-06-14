import { cn } from "@/lib/cn";
import { formatDuration, formatPrice } from "@/lib/utils";

type Service = {
  id: number;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
};

type ServiceListProps = {
  services: Service[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function ServiceList({
  services,
  selectedId,
  onSelect,
}: ServiceListProps) {
  return (
    <div className="card-app px-4">
      {services.map((service) => {
        const isSelected = service.id === selectedId;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service.id)}
            className={cn(
              "service-row w-full text-right",
              isSelected ? "service-row-selected" : "service-row-unselected"
            )}
            aria-pressed={isSelected}
          >
            <div>
              <p className="font-medium text-text-primary">{service.name}</p>
              <p className="text-sm text-text-secondary">
                {formatDuration(service.durationMin)}
              </p>
            </div>
            <span
              className={cn(
                "text-base font-semibold",
                isSelected ? "text-gold-start" : "text-text-primary"
              )}
            >
              {formatPrice(service.price)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
