"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
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
};

const PX_PER_MINUTE = 3.5;

const BLOCK_COLORS = [
  "admin-cal-block--blue",
  "admin-cal-block--yellow",
  "admin-cal-block--purple",
  "admin-cal-block--teal",
  "admin-cal-block--pink",
  "admin-cal-block--orange",
];

function formatTimeRange(start: string, durationMin: number) {
  const startMin = timeToMinutes(start);
  return `${start} - ${minutesToTime(startMin + durationMin)}`;
}

export function AdminDayCalendar({
  date,
  appointments,
  workingHours,
  selectedId,
  onSelect,
}: AdminDayCalendarProps) {
  const isToday = isTodayInJerusalem(date);
  const nowMinutes = isToday ? getJerusalemTimeMinutes() : null;

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

  const hourLabels = useMemo(() => {
    if (!workingHours) return [];
    const labels: { minutes: number; label: string }[] = [];
    for (let m = startMinutes; m < endMinutes; m += 60) {
      labels.push({ minutes: m, label: minutesToTime(m) });
    }
    return labels;
  }, [workingHours, startMinutes, endMinutes]);

  if (!workingHours) {
    return (
      <div className="admin-cal admin-cal--empty">
        <p className="text-center text-sm text-text-secondary">אין שעות פעילות ביום זה</p>
      </div>
    );
  }

  return (
    <div className="admin-cal">
      <div className="admin-cal__scroll">
        <div className="admin-cal__canvas" style={{ height: totalHeight }}>
          {hourLabels.map(({ minutes, label }) => (
            <div
              key={label}
              className="admin-cal__hour-line"
              style={{ top: (minutes - startMinutes) * PX_PER_MINUTE }}
            >
              <span className="admin-cal__hour-label">{label}</span>
            </div>
          ))}

          {isToday && nowMinutes !== null && nowMinutes >= startMinutes && (
            <div
              className="admin-cal__now-line"
              style={{ top: (nowMinutes - startMinutes) * PX_PER_MINUTE }}
            />
          )}

          {appointments.map((appt, index) => {
            const top =
              (timeToMinutes(appt.time) - startMinutes) * PX_PER_MINUTE;
            const height = appt.serviceDuration * PX_PER_MINUTE;
            const selected = selectedId === appt.id;

            return (
              <button
                key={appt.id}
                type="button"
                className={cn(
                  "admin-cal-block",
                  BLOCK_COLORS[index % BLOCK_COLORS.length],
                  appt.status === "pending" && "admin-cal-block--pending",
                  appt.status === "cancelled" && "admin-cal-block--cancelled",
                  selected && "admin-cal-block--selected"
                )}
                style={{ top, height: Math.max(height, 52) }}
                onClick={() => onSelect(appt.id)}
              >
                <span className="admin-cal-block__name">{appt.customerName}</span>
                <span className="admin-cal-block__meta">
                  {formatTimeRange(appt.time, appt.serviceDuration)} ·{" "}
                  {appt.serviceName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
