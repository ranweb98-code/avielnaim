"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Check,
  CreditCard,
  MessageCircle,
  Pencil,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/Button";
import { ServiceCarousel } from "@/components/ServiceCarousel";
import { Textarea } from "@/components/Input";
import { cn } from "@/lib/cn";
import {
  filterAdminBookingServices,
  toTelUrl,
  toWhatsAppUrl,
} from "@/lib/services";
import { minutesToTime, timeToMinutes } from "@/lib/timezone";

export type AdminSheetAppointment = {
  id: number;
  serviceId: number;
  customerId?: number | null;
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
  price?: number;
};

type AdminAppointmentSheetProps = {
  appointment: AdminSheetAppointment | null;
  services?: ServiceOption[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (id: number) => void;
  onCancel: (id: number, noShow?: boolean) => void;
  onDelete: (id: number) => void | Promise<void>;
  onSaveNotes: (id: number, notes: string) => void;
  onStartCalendarReschedule: (id: number) => void;
  onUpdateSchedule: (
    id: number,
    data: { time?: string; serviceDuration?: number }
  ) => void | Promise<void>;
  onUpdatePhone: (id: number, phone: string) => void | Promise<void>;
  onSwitchService: (id: number, serviceId: number) => void | Promise<void>;
};

const DURATION_OPTIONS = Array.from({ length: 36 }, (_, i) => (i + 1) * 5); // 5..180
const WHEEL_ITEM_HEIGHT = 44;

function formatDisplayDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function DurationWheelPicker({
  value,
  onConfirm,
  onClose,
}: {
  value: number;
  onConfirm: (minutes: number) => void;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(() => {
    const snapped = Math.round(value / 5) * 5;
    return Math.min(180, Math.max(5, snapped || 35));
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const index = DURATION_OPTIONS.indexOf(selected);
    if (index < 0) return;
    el.scrollTop = index * WHEEL_ITEM_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(DURATION_OPTIONS.length - 1, index));
    const next = DURATION_OPTIONS[clamped];
    if (next !== selected) setSelected(next);
  }

  return createPortal(
    <>
      <button
        type="button"
        className="admin-move-confirm-backdrop"
        aria-label="סגור"
        onClick={onClose}
      />
      <div
        className="admin-duration-wheel"
        role="dialog"
        aria-modal="true"
        aria-label="בחירת משך שירות"
      >
        <div className="admin-duration-wheel__header">
          <button
            type="button"
            className="admin-duration-wheel__cancel"
            onClick={onClose}
          >
            ביטול
          </button>
          <span className="admin-duration-wheel__title">משך השירות</span>
          <button
            type="button"
            className="admin-duration-wheel__done"
            onClick={() => onConfirm(selected)}
          >
            אישור
          </button>
        </div>

        <div className="admin-duration-wheel__stage">
          <div className="admin-duration-wheel__highlight" aria-hidden />
          <div
            ref={listRef}
            className="admin-duration-wheel__list"
            onScroll={handleScroll}
          >
            <div
              className="admin-duration-wheel__spacer"
              style={{ height: WHEEL_ITEM_HEIGHT * 2 }}
            />
            {DURATION_OPTIONS.map((mins) => (
              <button
                key={mins}
                type="button"
                className={cn(
                  "admin-duration-wheel__item",
                  mins === selected && "admin-duration-wheel__item--active"
                )}
                style={{ height: WHEEL_ITEM_HEIGHT }}
                onClick={() => {
                  setSelected(mins);
                  const el = listRef.current;
                  if (!el) return;
                  const index = DURATION_OPTIONS.indexOf(mins);
                  el.scrollTo({
                    top: index * WHEEL_ITEM_HEIGHT,
                    behavior: "smooth",
                  });
                }}
              >
                {mins} דק׳
              </button>
            ))}
            <div
              className="admin-duration-wheel__spacer"
              style={{ height: WHEEL_ITEM_HEIGHT * 2 }}
            />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export function AdminAppointmentSheet({
  appointment,
  services = [],
  loading = false,
  onClose,
  onConfirm,
  onCancel,
  onDelete,
  onSaveNotes,
  onStartCalendarReschedule,
  onUpdateSchedule,
  onUpdatePhone,
  onSwitchService,
}: AdminAppointmentSheetProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState(0);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPhoneConfirm, setShowPhoneConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!appointment) {
      setShowDeleteConfirm(false);
      setShowDurationPicker(false);
      setShowPhoneConfirm(false);
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
    setEditPhone(appointment.customerPhone);
    setEditTime(appointment.time);
    setEditDuration(appointment.serviceDuration);
  }, [appointment]);

  const endTime = useMemo(() => {
    if (!editTime) return "";
    return minutesToTime(timeToMinutes(editTime) + editDuration);
  }, [editTime, editDuration]);

  const scheduleDirty =
    Boolean(appointment) &&
    (editTime !== appointment!.time ||
      editDuration !== appointment!.serviceDuration);

  const phoneDirty =
    Boolean(appointment) && editPhone.trim() !== appointment!.customerPhone;

  const haircutServices = useMemo(
    () =>
      filterAdminBookingServices(services).map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.durationMin,
        price: "price" in s ? (s.price as number) : 0,
        description: null,
      })),
    [services]
  );

  function goToCustomerEdit() {
    if (!appointment) return;
    onClose();
    if (appointment.customerId) {
      router.push(`/admin/customers?edit=${appointment.customerId}`);
      return;
    }
    router.push(
      `/admin/customers?q=${encodeURIComponent(appointment.customerPhone)}`
    );
  }

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

  const phoneConfirmDialog =
    showPhoneConfirm && mounted
      ? createPortal(
          <>
            <button
              type="button"
              className="admin-move-confirm-backdrop"
              aria-label="סגור"
              disabled={loading}
              onClick={() => !loading && setShowPhoneConfirm(false)}
            />
            <div
              className="admin-move-confirm-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="admin-phone-confirm-title"
            >
              <p
                id="admin-phone-confirm-title"
                className="admin-move-confirm-modal__text"
              >
                לעדכן את המספר ל-<strong dir="ltr">{editPhone.trim()}</strong>?
                <br />
                <span className="text-sm text-text-muted">
                  המספר יתעדכן גם בכרטיס הלקוח ובכל התורים שלו
                </span>
              </p>
              <div className="admin-move-confirm-modal__actions">
                <button
                  type="button"
                  className="admin-cal__confirm-btn admin-cal__confirm-btn--yes"
                  disabled={loading}
                  onClick={() => {
                    void Promise.resolve(
                      onUpdatePhone(appointment.id, editPhone.trim())
                    ).then(() => setShowPhoneConfirm(false));
                  }}
                >
                  {loading ? "שומר..." : "כן, עדכן"}
                </button>
                <button
                  type="button"
                  className="admin-cal__confirm-btn admin-cal__confirm-btn--no"
                  disabled={loading}
                  onClick={() => setShowPhoneConfirm(false)}
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
      {phoneConfirmDialog}
      {showDurationPicker && (
        <DurationWheelPicker
          value={editDuration}
          onClose={() => setShowDurationPicker(false)}
          onConfirm={(minutes) => {
            setEditDuration(minutes);
            setShowDurationPicker(false);
          }}
        />
      )}
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
            <div className="min-w-0">
              <button
                type="button"
                className="admin-sheet__title admin-sheet__title--link"
                onClick={goToCustomerEdit}
              >
                {appointment.customerName}
              </button>
              {appointment.status === "cancelled" && (
                <p className="admin-sheet__status">
                  {appointment.notes === "הברזה" ? "הברזה" : "בוטל"}
                </p>
              )}
            </div>
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
            <div className="admin-sheet-contact-actions">
              <a
                href={toWhatsAppUrl(appointment.customerPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-sheet-contact-btn admin-sheet-contact-btn--whatsapp"
              >
                <MessageCircle className="h-5 w-5" />
                <span>WhatsApp</span>
              </a>
              <a
                href={toTelUrl(appointment.customerPhone)}
                className="admin-sheet-contact-btn admin-sheet-contact-btn--call"
              >
                <Phone className="h-5 w-5" />
                <span>התקשר</span>
              </a>
            </div>

            <Textarea
              label="הערות לקוח/ה"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />

            <div className="admin-sheet-phone">
              <label className="admin-sheet-field admin-sheet-field--grow">
                <span className="admin-sheet-field__label">מספר נייד</span>
                <input
                  type="tel"
                  className="admin-sheet-field__input"
                  dir="ltr"
                  value={editPhone}
                  disabled={loading}
                  onChange={(e) => setEditPhone(e.target.value)}
                  aria-label="מספר נייד"
                />
              </label>
            </div>

            {phoneDirty && (
              <Button
                variant="secondary"
                className="w-full"
                loading={loading}
                onClick={() => setShowPhoneConfirm(true)}
              >
                שמור מספר
              </Button>
            )}

            <label className="admin-sheet-field">
              <span className="admin-sheet-field__label">תאריך</span>
              <div className="admin-sheet-field__value">
                {formatDisplayDate(appointment.date)}
              </div>
            </label>

            <label className="admin-sheet-field">
              <span className="admin-sheet-field__label">שעת התחלה</span>
              <input
                type="time"
                className="admin-sheet-field__input admin-sheet-field__input--time"
                dir="ltr"
                value={editTime}
                disabled={loading}
                onChange={(e) => setEditTime(e.target.value)}
                aria-label="שעת התחלה"
              />
            </label>

            <div className="admin-sheet-field">
              <span className="admin-sheet-field__label">משך השירות</span>
              <button
                type="button"
                className="admin-sheet-field__input admin-sheet-field__input--button"
                dir="ltr"
                disabled={loading}
                onClick={() => setShowDurationPicker(true)}
                aria-label="בחירת משך שירות"
              >
                {editDuration} דק׳
              </button>
            </div>

            {scheduleDirty && (
              <Button
                className="w-full"
                loading={loading}
                onClick={() => {
                  const payload: {
                    time?: string;
                    serviceDuration?: number;
                  } = {};
                  if (editTime !== appointment.time) payload.time = editTime;
                  if (editDuration !== appointment.serviceDuration) {
                    payload.serviceDuration = editDuration;
                  }
                  void onUpdateSchedule(appointment.id, payload);
                }}
              >
                שמור שעה ומשך
              </Button>
            )}

            {haircutServices.length > 0 && appointment.status !== "cancelled" && (
              <ServiceCarousel
                services={haircutServices}
                selectedId={appointment.serviceId}
                onSelect={(id) => {
                  if (id !== appointment.serviceId) {
                    void onSwitchService(appointment.id, id);
                  }
                }}
                disabled={loading}
                label="סוג תספורת"
              />
            )}

            {appointment.status === "cancelled" && (
              <label className="admin-sheet-field">
                <span className="admin-sheet-field__label">שירותים</span>
                <div className="admin-sheet-service-row">
                  <span>{appointment.serviceName}</span>
                  <span className="text-sm text-text-muted" dir="ltr">
                    {editTime} - {endTime}
                  </span>
                </div>
              </label>
            )}

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
              <button
                type="button"
                className="admin-sheet-action"
                onClick={goToCustomerEdit}
              >
                <CreditCard className="h-5 w-5" />
                <span>לקוח</span>
              </button>
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
                    className={cn(
                      "admin-sheet-action",
                      "admin-sheet-action--danger"
                    )}
                    disabled={loading}
                    onClick={() => onCancel(appointment.id, true)}
                  >
                    <X className="h-5 w-5" />
                    <span>הברזה</span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "admin-sheet-action",
                      "admin-sheet-action--danger"
                    )}
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
                className={cn(
                  "admin-sheet-action",
                  "admin-sheet-action--danger"
                )}
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
