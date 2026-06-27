"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  onReschedule?: (id: number, time: string) => void | Promise<void>;
  rescheduleTargetId?: number | null;
  rescheduleMode?: boolean;
  isClosedDay?: boolean;
};

type DragState = {
  id: number;
  startY: number;
  startTop: number;
  currentTop: number;
  originalMinutes: number;
  height: number;
};

type PendingMove = {
  id: number;
  time: string;
  top: number;
  height: number;
  customerName: string;
};

const PX_PER_MINUTE = 3.5;
const MIN_BLOCK_HEIGHT = 44;
const SLOT_STEP = 5;
const DRAG_THRESHOLD_PX = 8;

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

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

export function AdminDayCalendar({
  date,
  appointments,
  workingHours,
  selectedId,
  onSelect,
  onSlotClick,
  onReschedule,
  rescheduleTargetId = null,
  rescheduleMode = false,
  isClosedDay = false,
}: AdminDayCalendarProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);
  const today = formatJerusalemDate();
  const isToday = isTodayInJerusalem(date);
  const isPastDay = date < today;
  const nowMinutes = isToday ? getJerusalemTimeMinutes() : null;
  const nowLabel = isToday
    ? formatJerusalemDate(new Date(), "HH:mm")
    : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!rescheduleTargetId) {
      setPendingMove(null);
    }
  }, [rescheduleTargetId]);

  useEffect(() => {
    if (!pendingMove) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingMove]);

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

  const dragPreviewMinutes = drag
    ? snapToStep(startMinutes + drag.currentTop / PX_PER_MINUTE)
    : null;

  function isSlotBookable(minutes: number): boolean {
    if (isClosedDay || isPastDay) return false;
    if (minutes < startMinutes || minutes >= endMinutes - SLOT_STEP) return false;
    return minutes >= minBookableMinutes;
  }

  function hasConflict(
    minutes: number,
    duration: number,
    excludeId: number
  ): boolean {
    const end = minutes + duration;
    for (const appt of appointments) {
      if (appt.id === excludeId || appt.status === "cancelled") continue;
      const apptStart = timeToMinutes(appt.time);
      const apptEnd = apptStart + appt.serviceDuration;
      if (rangesOverlap(minutes, end, apptStart, apptEnd)) return true;
    }
    return false;
  }

  function slotFromPointer(clientY: number, canvasEl: HTMLDivElement): number {
    return minutesFromPointer(
      clientY,
      canvasEl.getBoundingClientRect().top,
      startMinutes,
      endMinutes
    );
  }

  function proposeMove(
    appt: AdminCalendarAppointment,
    minutes: number,
    height: number
  ) {
    if (minutes === timeToMinutes(appt.time)) return;

    if (!isSlotBookable(minutes)) return;

    if (hasConflict(minutes, appt.serviceDuration, appt.id)) {
      window.alert("השעה החדשה חופפת לתור אחר");
      return;
    }

    setPendingMove({
      id: appt.id,
      time: minutesToTime(minutes),
      top: (minutes - startMinutes) * PX_PER_MINUTE,
      height,
      customerName: appt.customerName,
    });
  }

  function handleSlotAction(clientY: number, canvasEl: HTMLDivElement) {
    if (drag || pendingMove) return;

    const minutes = slotFromPointer(clientY, canvasEl);

    if (rescheduleTargetId) {
      const appt = appointments.find((a) => a.id === rescheduleTargetId);
      if (!appt) return;
      const height = Math.max(
        appt.serviceDuration * PX_PER_MINUTE,
        MIN_BLOCK_HEIGHT
      );
      proposeMove(appt, minutes, height);
      return;
    }

    if (!onSlotClick) return;
    if (!isSlotBookable(minutes)) return;
    onSlotClick(minutesToTime(minutes));
  }

  function clampTop(top: number, height: number): number {
    return Math.max(0, Math.min(totalHeight - height, top));
  }

  function handleBlockPointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
    appt: AdminCalendarAppointment,
    top: number,
    height: number
  ) {
    if (!onReschedule || appt.status === "cancelled" || pendingMove) return;

    e.stopPropagation();
    setPendingMove(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      id: appt.id,
      startY: e.clientY,
      startTop: top,
      currentTop: top,
      originalMinutes: timeToMinutes(appt.time),
      height,
    });
  }

  function handleBlockPointerMove(
    e: React.PointerEvent<HTMLButtonElement>,
    apptId: number
  ) {
    if (!drag || drag.id !== apptId) return;

    e.stopPropagation();
    const deltaY = e.clientY - drag.startY;
    const nextTop = clampTop(drag.startTop + deltaY, drag.height);
    setDrag({ ...drag, currentTop: nextTop });
  }

  function handleBlockPointerUp(
    e: React.PointerEvent<HTMLButtonElement>,
    appt: AdminCalendarAppointment
  ) {
    if (!drag || drag.id !== appt.id) return;

    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const moved = Math.abs(e.clientY - drag.startY) >= DRAG_THRESHOLD_PX;
    const newMinutes = snapToStep(
      startMinutes + drag.currentTop / PX_PER_MINUTE
    );

    setDrag(null);

    if (!moved) {
      onSelect(appt.id);
      return;
    }

    proposeMove(appt, newMinutes, drag.height);
  }

  function handleBlockPointerCancel(
    e: React.PointerEvent<HTMLButtonElement>,
    apptId: number
  ) {
    if (!drag || drag.id !== apptId) return;
    e.stopPropagation();
    setDrag(null);
  }

  async function confirmPendingMove() {
    if (!pendingMove || !onReschedule) return;
    setConfirming(true);
    try {
      await onReschedule(pendingMove.id, pendingMove.time);
      setPendingMove(null);
    } finally {
      setConfirming(false);
    }
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

  const bookingEnabled =
    Boolean(onSlotClick || rescheduleTargetId) &&
    !isPastDay &&
    !isClosedDay &&
    !drag &&
    !pendingMove;

  const confirmDialog =
    pendingMove && mounted
      ? createPortal(
          <>
            <button
              type="button"
              className="admin-move-confirm-backdrop"
              aria-label="סגור"
              onClick={() => !confirming && setPendingMove(null)}
            />
            <div
              className="admin-move-confirm-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="admin-move-confirm-title"
            >
              <p id="admin-move-confirm-title" className="admin-move-confirm-modal__text">
                להעביר את <strong>{pendingMove.customerName}</strong> ל-
                <strong dir="ltr">{pendingMove.time}</strong>?
              </p>
              <div className="admin-move-confirm-modal__actions">
                <button
                  type="button"
                  className="admin-cal__confirm-btn admin-cal__confirm-btn--yes"
                  disabled={confirming}
                  onClick={confirmPendingMove}
                >
                  {confirming ? "שומר..." : "כן, העבר"}
                </button>
                <button
                  type="button"
                  className="admin-cal__confirm-btn admin-cal__confirm-btn--no"
                  disabled={confirming}
                  onClick={() => setPendingMove(null)}
                >
                  ביטול
                </button>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={cn(
          "admin-cal admin-cal--calmark",
          isPastDay && "admin-cal--past-day",
          isClosedDay && "admin-cal--closed-day",
          rescheduleMode && "admin-cal--reschedule-mode"
        )}
      >
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
            ref={canvasRef}
            className={cn(
              "admin-cal__canvas",
              !bookingEnabled && !drag && "admin-cal__canvas--readonly",
              drag && "admin-cal__canvas--dragging",
              (isPastDay || isClosedDay) && "admin-cal__canvas--unavailable"
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
                if (rescheduleTargetId) {
                  const appt = appointments.find(
                    (a) => a.id === rescheduleTargetId
                  );
                  if (appt) {
                    proposeMove(
                      appt,
                      minBookableMinutes,
                      Math.max(
                        appt.serviceDuration * PX_PER_MINUTE,
                        MIN_BLOCK_HEIGHT
                      )
                    );
                  }
                } else {
                  onSlotClick?.(minutesToTime(minBookableMinutes));
                }
              }
            }}
            onMouseMove={(e) => {
              if (!bookingEnabled && !rescheduleTargetId) return;
              const minutes = slotFromPointer(e.clientY, e.currentTarget);
              setHoverMinutes(isSlotBookable(minutes) ? minutes : null);
            }}
            onMouseLeave={() => setHoverMinutes(null)}
          >
            {pastOverlayHeight > 0 && (
              <div
                className="admin-cal__unavailable"
                style={{ height: pastOverlayHeight }}
                aria-hidden="true"
              />
            )}

            {isClosedDay && (
              <div className="admin-cal__closed-overlay" aria-hidden="true">
                <span className="admin-cal__closed-label">סגור היום</span>
              </div>
            )}

            {hourLabels.map(({ minutes }) => (
              <div
                key={minutes}
                className="admin-cal__hour-line"
                style={{ top: (minutes - startMinutes) * PX_PER_MINUTE }}
              />
            ))}

            {(bookingEnabled || rescheduleTargetId) &&
              hoverMinutes !== null && (
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

            {drag && dragPreviewMinutes !== null && (
              <div
                className={cn(
                  "admin-cal__drag-preview",
                  !isSlotBookable(dragPreviewMinutes) &&
                    "admin-cal__drag-preview--invalid"
                )}
                style={{
                  top: (dragPreviewMinutes - startMinutes) * PX_PER_MINUTE,
                  height: drag.height,
                }}
                aria-hidden="true"
              >
                <span className="admin-cal__drag-preview-label">
                  {minutesToTime(dragPreviewMinutes)}
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
              const baseTop =
                (timeToMinutes(appt.time) - startMinutes) * PX_PER_MINUTE;
              const height = Math.max(
                appt.serviceDuration * PX_PER_MINUTE,
                MIN_BLOCK_HEIGHT
              );
              const isDragging = drag?.id === appt.id;
              const isPending = pendingMove?.id === appt.id;
              const top = isDragging
                ? drag.currentTop
                : isPending
                  ? pendingMove.top
                  : baseTop;
              const selected = selectedId === appt.id;
              const draggable =
                Boolean(onReschedule) &&
                appt.status !== "cancelled" &&
                !pendingMove;

              return (
                <button
                  key={appt.id}
                  type="button"
                  className={cn(
                    "admin-cal-block",
                    appt.status === "pending" && "admin-cal-block--pending",
                    appt.status === "cancelled" &&
                      "admin-cal-block--cancelled",
                    selected && !isDragging && !isPending && "admin-cal-block--selected",
                    isDragging && "admin-cal-block--dragging",
                    isPending && "admin-cal-block--pending-move",
                    draggable && "admin-cal-block--draggable"
                  )}
                  style={{ top, height }}
                  onPointerDown={(e) =>
                    handleBlockPointerDown(e, appt, baseTop, height)
                  }
                  onPointerMove={(e) => handleBlockPointerMove(e, appt.id)}
                  onPointerUp={(e) => handleBlockPointerUp(e, appt)}
                  onPointerCancel={(e) =>
                    handleBlockPointerCancel(e, appt.id)
                  }
                  onClick={(e) => e.stopPropagation()}
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
      {confirmDialog}
    </>
  );
}
