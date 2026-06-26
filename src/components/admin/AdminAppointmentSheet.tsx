"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Input, Textarea } from "@/components/Input";
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

type ServiceOption = {
  id: number;
  name: string;
  durationMin: number;
};

type AdminAppointmentSheetProps = {
  appointment: AdminSheetAppointment | null;
  services: ServiceOption[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (id: number) => void;
  onCancel: (id: number, noShow?: boolean) => void;
  onDelete: (id: number) => void;
  onSaveNotes: (id: number, notes: string) => void;
  onReschedule: (id: number, data: {
    date: string;
    time: string;
    serviceId: number;
  }) => void;
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
  services,
  loading = false,
  onClose,
  onConfirm,
  onCancel,
  onDelete,
  onSaveNotes,
  onReschedule,
}: AdminAppointmentSheetProps) {
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [notes, setNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editServiceId, setEditServiceId] = useState<number | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    setMode("view");
    setNotes(appointment.notes ?? "");
    setEditDate(appointment.date);
    setEditTime(appointment.time);
    setEditServiceId(appointment.serviceId);
  }, [appointment]);

  useEffect(() => {
    if (mode !== "reschedule" || !editDate || !editServiceId) return;

    setSlotsLoading(true);
    fetch(`/api/availability?date=${editDate}&serviceId=${editServiceId}`)
      .then((res) => res.json())
      .then((data) => setTimeSlots(data.slots ?? []))
      .catch(() => setTimeSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [mode, editDate, editServiceId]);

  const endTime = useMemo(() => {
    if (!appointment) return "";
    return minutesToTime(
      timeToMinutes(appointment.time) + appointment.serviceDuration
    );
  }, [appointment]);

  if (!appointment) return null;

  return (
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
          <h2 className="admin-sheet__title">
            {mode === "reschedule" ? "שינוי תור" : appointment.customerName}
          </h2>
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
          {mode === "reschedule" ? (
            <div className="admin-sheet-form space-y-3">
              <div className="admin-sheet-form__row">
                <Input
                  label="תאריך"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
                <label className="admin-sheet-field">
                  <span className="admin-sheet-field__label">שעה</span>
                  <select
                    className="admin-sheet-field__input"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    disabled={slotsLoading}
                  >
                    <option value="">בחר שעה</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="admin-sheet-field">
                <span className="admin-sheet-field__label">שירותים</span>
                <select
                  className="admin-sheet-field__input"
                  value={editServiceId ?? ""}
                  onChange={(e) => setEditServiceId(Number(e.target.value))}
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  loading={loading}
                  onClick={() => {
                    if (!editServiceId || !editDate || !editTime) return;
                    onReschedule(appointment.id, {
                      date: editDate,
                      time: editTime,
                      serviceId: editServiceId,
                    });
                  }}
                >
                  שמירה
                </Button>
                <Button variant="secondary" onClick={() => setMode("view")}>
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <>
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
                  <span className="text-text-muted text-sm">
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
                  onClick={() => setMode("reschedule")}
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
                  onClick={() => onDelete(appointment.id)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
