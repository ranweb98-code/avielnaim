"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeftRight,
  Check,
  CreditCard,
  MessageCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Input";
import { cn } from "@/lib/cn";
import { minutesToTime, timeToMinutes } from "@/lib/timezone";

export type AdminSheetAppointment = {
  id: number;
  serviceId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceName: string;
  serviceDuration: number;
  date: string;
  time: string;
  notes: string | null;
  status: "pending" | "confirmed" | "cancelled";
};

type AdminAppointmentSheetProps = {
  appointment: AdminSheetAppointment | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (id: number) => void;
  onCancel: (id: number, noShow?: boolean) => void;
  onDelete: (id: number) => void | Promise<void>;
  onSaveNotes: (id: number, notes: string) => void;
  onStartCalendarReschedule: (id: number) => void;
};

function formatDisplayDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function whatsAppUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0")
    ? `972${digits.slice(1)}`
    : digits;
  return `https://wa.me/${normalized}`;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function AdminAppointmentSheet({
  appointment,
  loading = false,
  onClose,
  onConfirm,
  onCancel,
  onDelete,
  onSaveNotes,
  onStartCalendarReschedule,
}: AdminAppointmentSheetProps) {
  const [notes, setNotes] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!appointment) {
      setShowDeleteConfirm(false);
    }
  }, [appointment]);

  useEffect(() => {
    if (!showDeleteConfirm) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showDeleteConfirm]);

  useEffect(() => {
    if (!appointment) return;
    setNotes(appointment.notes ?? "");
  }, [appointment]);

  const endTime = useMemo(() => {
    if (!appointment) return "";
    return minutesToTime(
      timeToMinutes(appointment.time) + appointment.serviceDuration
    );
  }, [appointment]);

  if (!appointment) return null;

  const deleteConfirmDialog =
    showDeleteConfirm && mounted
      ? createPortal(
          <>
            <button
              type="button"
              className="admin-move-confirm-backdrop"
              aria-label="סגור"
              disabled={loading}
              onClick={() => !loading && setShowDeleteConfirm(false)}
            />
            <div
              className="admin-move-confirm-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="admin-delete-confirm-title"
            >
              <p
                id="admin-delete-confirm-title"
                className="admin-move-confirm-modal__text"
              >
                למחוק את התור של <strong>{appointment.customerName}</strong>{" "}
                לצמיתות?
              </p>
              <div className="admin-move-confirm-modal__actions">
                <button
                  type="button"
                  className="admin-cal__confirm-btn admin-cal__confirm-btn--yes admin-cal__confirm-btn--danger"
                  disabled={loading}
                  onClick={() => {
                    void Promise.resolve(onDelete(appointment.id)).then(() => {
                      setShowDeleteConfirm(false);
                    });
                  }}
                >
                  {loading ? "מוחק..." : "כן, מחק"}
                </button>
                <button
                  type="button"
                  className="admin-cal__confirm-btn admin-cal__confirm-btn--no"
                  disabled={loading}
                  onClick={() => setShowDeleteConfirm(false)}
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
      {deleteConfirmDialog}
      <div className="admin-sheet-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="admin-sheet-backdrop"
        aria-label="סגור"
        onClick={onClose}
      />
      <div className="admin-sheet">
        <div className="admin-sheet__handle" aria-hidden />
        <div className="admin-sheet__header">
          <h2 className="admin-sheet__title">{appointment.customerName}</h2>
          <button
            type="button"
            className="admin-modal__close"
            onClick={onClose}
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="admin-sheet__body">
          <label className="admin-sheet-field">
            <span className="admin-sheet-field__label">שם</span>
            <div className="admin-sheet-field__value">{appointment.customerName}</div>
          </label>

          <Textarea
            label="הערות לקוח/ה"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <div className="admin-sheet-phone">
            <label className="admin-sheet-field admin-sheet-field--grow">
              <span className="admin-sheet-field__label">מספר נייד</span>
              <div className="admin-sheet-field__value" dir="ltr">
                {appointment.customerPhone}
              </div>
            </label>
            <a
              href={whatsAppUrl(appointment.customerPhone)}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-sheet-whatsapp"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          </div>

          <div className="admin-sheet-form__row admin-sheet-form__row--thirds">
            <label className="admin-sheet-field">
              <span className="admin-sheet-field__label">תאריך</span>
              <div className="admin-sheet-field__value">
                {formatDisplayDate(appointment.date)}
              </div>
            </label>
            <label className="admin-sheet-field">
              <span className="admin-sheet-field__label">שעת התחלה</span>
              <div className="admin-sheet-field__value">{appointment.time}</div>
            </label>
            <label className="admin-sheet-field">
              <span className="admin-sheet-field__label">משך השירות</span>
              <div className="admin-sheet-field__value">
                {formatDuration(appointment.serviceDuration)}
              </div>
            </label>
          </div>

          <label className="admin-sheet-field">
            <span className="admin-sheet-field__label">שירותים</span>
            <div className="admin-sheet-service-row">
              <span>{appointment.serviceName}</span>
              <span className="text-sm text-text-muted">
                {appointment.time} - {endTime}
              </span>
            </div>
          </label>

          {notes !== (appointment.notes ?? "") && (
            <Button
              variant="secondary"
              className="w-full"
              loading={loading}
              onClick={() => onSaveNotes(appointment.id, notes)}
            >
              שמור הערות
            </Button>
          )}

          <div className="admin-sheet-actions">
            <Link
              href={`/admin/customers?q=${encodeURIComponent(appointment.customerPhone)}`}
              className="admin-sheet-action"
            >
              <CreditCard className="h-5 w-5" />
              <span>כרטיס</span>
            </Link>
            <button
              type="button"
              className="admin-sheet-action"
              onClick={() => onStartCalendarReschedule(appointment.id)}
            >
              <Pencil className="h-5 w-5" />
              <span>שינוי</span>
            </button>
            {appointment.status !== "cancelled" && (
              <>
                <button
                  type="button"
                  className={cn("admin-sheet-action", "admin-sheet-action--danger")}
                  disabled={loading}
                  onClick={() => onCancel(appointment.id, true)}
                >
                  <X className="h-5 w-5" />
                  <span>הברזה</span>
                </button>
                <button
                  type="button"
                  className={cn("admin-sheet-action", "admin-sheet-action--danger")}
                  disabled={loading}
                  onClick={() => onCancel(appointment.id)}
                >
                  <ArrowLeftRight className="h-5 w-5" />
                  <span>ביטול</span>
                </button>
              </>
            )}
            <button
              type="button"
              className={cn("admin-sheet-action", "admin-sheet-action--danger")}
              disabled={loading}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-5 w-5" />
              <span>מחק</span>
            </button>
          </div>

          {appointment.status === "pending" && (
            <Button
              className="w-full"
              loading={loading}
              onClick={() => onConfirm(appointment.id)}
            >
              <Check className="h-4 w-4" />
              אישור תור
            </Button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
