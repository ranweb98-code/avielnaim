"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { formatDuration, formatPrice } from "@/lib/utils";

type Service = {
  id: number;
  name: string;
  description?: string | null;
  durationMin: number;
  price: number;
};

type ServiceCarouselProps = {
  services: Service[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  disabled?: boolean;
  label?: string;
};

export function ServiceCarousel({
  services,
  selectedId,
  onSelect,
  disabled = false,
  label = "סוג תספורת",
}: ServiceCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    const card = cardRefs.current.get(selectedId);
    card?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedId]);

  if (services.length === 0) return null;

  return (
    <div className="service-carousel">
      <span className="admin-sheet-field__label">{label}</span>
      <div
        ref={trackRef}
        className="service-carousel__track"
        role="listbox"
        aria-label={label}
      >
        {services.map((service) => {
          const isSelected = service.id === selectedId;
          return (
            <button
              key={service.id}
              ref={(el) => {
                if (el) cardRefs.current.set(service.id, el);
                else cardRefs.current.delete(service.id);
              }}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={disabled}
              className={cn(
                "service-carousel__card",
                isSelected && "service-carousel__card--selected"
              )}
              onClick={() => onSelect(service.id)}
            >
              <p className="service-carousel__name">{service.name}</p>
              <p className="service-carousel__meta">
                {formatDuration(service.durationMin)}
              </p>
              <p className="service-carousel__price">
                {formatPrice(service.price)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
