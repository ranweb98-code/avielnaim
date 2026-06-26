"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  formatJerusalemDate,
  getJerusalemTimeMinutes,
  isTodayInJerusalem,
  minutesToTime,
  timeToMinutes,
} from "@/lib/timezone";

export type AdminCalendarAppointment = {
  id: number;
  customerName: string;
  serviceName: string;
  time: string;
  serviceDuration: number;
  status: "pending" | "confirmed" | "cancelled";
};

type AdminDayCalendarProps = {
  date: string;
  appointments: AdminCalendarAppointment[];
  workingHours: { startTime: string; endTime: string } | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onSlotClick?: (time: string) => void;
};

const PX_PER_MINUTE = 3.5;
const MIN_BLOCK_HEIGHT = 44;
const SLOT_STEP = 5;

function formatBlockLabel(appt: AdminCalendarAppointment): string {
  const startMin = timeToMinutes(appt.time);
  const end = minutesToTime(startMin + appt.serviceDuration);
  return `${appt.customerName} ${appt.time} - ${end} ${appt.serviceName}`;
}

function snapToStep(minutes: number): number {
  return Math.round(minutes / SLOT_STEP) * SLOT_STEP;
}

function nextBookableMinute(nowMinutes: number): number {
  return Math.ceil(nowMinutes / SLOT_STEP) * SLOT_STEP;
}

function minutesFromPointer(
  clientY: number,
  canvasTop: number,
  startMinutes: number,
  endMinutes: number
): number {
  const y = clientY - canvasTop;
  const raw = startMinutes + y / PX_PER_MINUTE;
  const snapped = snapToStep(raw);
  return Math.max(startMinutes, Math.min(endMinutes - SLOT_STEP, snapped));
}

export function AdminDayCalendar({
  date,
  appointments,
  workingHours,
  selectedId,
  onSelect,
  onSlotClick,
}: AdminDayCalendarProps) {
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);
  const today = formatJerusalemDate();
  const isToday = isTodayInJerusalem(date);
  const isPastDay = date < today;
  const nowMinutes = isToday ? getJerusalemTimeMinutes() : null;
  const nowLabel = isToday
    ? formatJerusalemDate(new Date(), "HH:mm")
    : null;

  const { startMinutes, endMinutes, totalHeight } = useMemo(() => {
    if (!workingHours) {
      return { startMinutes: 0, endMinutes: 0, totalHeight: 0 };
    }
    const start = timeToMinutes(workingHours.startTime);
    const end = timeToMinutes(workingHours.endTime);
    return {
      startMinutes: start,
      endMinutes: end,
      totalHeight: (end - start) * PX_PER_MINUTE,
    };
  }, [workingHours]);

  const minBookableMinutes = useMemo(() => {
    if (isPastDay) return endMinutes;
    if (!isToday || nowMinutes === null) return startMinutes;
    return nextBookableMinute(nowMinutes);
  }, [isPastDay, isToday, nowMinutes, startMinutes, endMinutes]);

  const pastOverlayHeight = useMemo(() => {
    if (isPastDay) return totalHeight;
    if (!isToday || nowMinutes === null) return 0;
    const bookableStart = Math.max(startMinutes, minBookableMinutes);
    return Math.max(0, (bookableStart - startMinutes) * PX_PER_MINUTE);
  }, [
    isPastDay,
    isToday,
    nowMinutes,
    startMinutes,
    minBookableMinutes,
    totalHeight,
  ]);

  const hourLabels = useMemo(() => {
    if (!workingHours) return [];
    const labels: { minutes: number; label: string }[] = [];
    for (let m = startMinutes; m < endMinutes; m += 60) {
      labels.push({ minutes: m, label: minutesToTime(m) });
    }
    return labels;
  }, [workingHours, startMinutes, endMinutes]);

  function isSlotBookable(minutes: number): boolean {
    if (isPastDay) return false;
    if (minutes < startMinutes || minutes >= endMinutes - SLOT_STEP) return false;
    return minutes >= minBookableMinutes;
  }

  function slotFromPointer(clientY: number, canvasEl: HTMLDivElement): number {
    return minutesFromPointer(
      clientY,
      canvasEl.getBoundingClientRect().top,
      startMinutes,
      endMinutes
    );
  }

  function handleSlotAction(clientY: number, canvasEl: HTMLDivElement) {
    if (!onSlotClick) return;
    const minutes = slotFromPointer(clientY, canvasEl);
    if (!isSlotBookable(minutes)) return;
    onSlotClick(minutesToTime(minutes));
  }

  if (!workingHours) {
    return (
      <div className="admin-cal admin-cal--calmark admin-cal--empty">
        <p className="text-center text-sm text-text-secondary">
          {appointments.length > 0
            ? "אין שעות פעילות — בחר תור מהרשימה"
            : "אין תורים ביום זה"}
        </p>
      </div>
    );
  }

  const bookingEnabled = Boolean(onSlotClick) && !isPastDay;

  return (
    <div className="admin-cal admin-cal--calmark">
      <div className="admin-cal__scroll">
        <div className="admin-cal__grid" style={{ height: totalHeight }}>
          <div className="admin-cal__times" aria-hidden="true">
            {hourLabels.map(({ minutes, label }) => (
              <span
                key={label}
                className="admin-cal__time-label"
                style={{ top: (minutes - startMinutes) * PX_PER_MINUTE }}
              >
                {label}
              </span>
            ))}
          </div>

          <div
            className={cn(
              "admin-cal__canvas",
              !bookingEnabled && "admin-cal__canvas--readonly"
            )}
            role={bookingEnabled ? "button" : undefined}
            tabIndex={bookingEnabled ? 0 : undefined}
            aria-label={
              bookingEnabled ? "לחץ לקביעת תור בשעה הנבחרת" : undefined
            }
            onClick={(e) => handleSlotAction(e.clientY, e.currentTarget)}
            onKeyDown={(e) => {
              if (!bookingEnabled || (e.key !== "Enter" && e.key !== " ")) {
                return;
              }
              e.preventDefault();
              if (isSlotBookable(minBookableMinutes)) {
                onSlotClick?.(minutesToTime(minBookableMinutes));
              }
            }}
            onMouseMove={(e) => {
              if (!bookingEnabled) return;
              const minutes = slotFromPointer(e.clientY, e.currentTarget);
              setHoverMinutes(isSlotBookable(minutes) ? minutes : null);
            }}
            onMouseLeave={() => setHoverMinutes(null)}
          >
            {pastOverlayHeight > 0 && (
              <div
                className="admin-cal__past"
                style={{ height: pastOverlayHeight }}
                aria-hidden="true"
              />
            )}

            {hourLabels.map(({ minutes }) => (
              <div
                key={minutes}
                className="admin-cal__hour-line"
                style={{ top: (minutes - startMinutes) * PX_PER_MINUTE }}
              />
            ))}

            {bookingEnabled && hoverMinutes !== null && (
              <div
                className="admin-cal__hover-slot"
                style={{
                  top: (hoverMinutes - startMinutes) * PX_PER_MINUTE,
                  height: SLOT_STEP * PX_PER_MINUTE,
                }}
              >
                <span className="admin-cal__hover-label">
                  {minutesToTime(hoverMinutes)}
                </span>
              </div>
            )}

            {isToday &&
              nowMinutes !== null &&
              nowMinutes >= startMinutes &&
              nowMinutes <= endMinutes && (
                <div
                  className="admin-cal__now-line"
                  style={{
                    top: (nowMinutes - startMinutes) * PX_PER_MINUTE,
                  }}
                >
                  {nowLabel && (
                    <span className="admin-cal__now-badge">{nowLabel}</span>
                  )}
                </div>
              )}

            {appointments.map((appt) => {
              const top =
                (timeToMinutes(appt.time) - startMinutes) * PX_PER_MINUTE;
              const height = Math.max(
                appt.serviceDuration * PX_PER_MINUTE,
                MIN_BLOCK_HEIGHT
              );
              const selected = selectedId === appt.id;

              return (
                <button
                  key={appt.id}
                  type="button"
                  className={cn(
                    "admin-cal-block",
                    appt.status === "pending" && "admin-cal-block--pending",
                    appt.status === "cancelled" &&
                      "admin-cal-block--cancelled",
                    selected && "admin-cal-block--selected"
                  )}
                  style={{ top, height }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(appt.id);
                  }}
                >
                  <span className="admin-cal-block__text">
                    {formatBlockLabel(appt)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
