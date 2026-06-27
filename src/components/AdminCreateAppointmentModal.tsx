"use client";

import { useCallback, useEffect, useState } from "react";
import { BookUser, Plus, X } from "lucide-react";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Input, Textarea } from "@/components/Input";
import { cn } from "@/lib/cn";
import {
  isContactPickerSupported,
  pickContactFromDevice,
} from "@/lib/contact-picker";
import { formatJerusalemDate } from "@/lib/timezone";

type Service = {
  id: number;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
};

type AdminCreateAppointmentModalProps = {
  open: boolean;
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onCreated: (created: {
    date: string;
    status: "pending" | "confirmed" | "cancelled";
  }) => void;
};

export function AdminCreateAppointmentModal({
  open,
  initialDate,
  initialTime,
  onClose,
  onCreated,
}: AdminCreateAppointmentModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"details" | "extra">("details");
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState(formatJerusalemDate());
  const [time, setTime] = useState("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<
    Array<{ id: number; fullName: string; phone: string; email: string }>
  >([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [contactPickerSupported, setContactPickerSupported] = useState(false);

  useEffect(() => {
    setContactPickerSupported(isContactPickerSupported());
  }, []);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setTab("details");
    setShowNewCustomer(false);
    fetch("/api/public")
      .then((r) => r.json())
      .then((data) => {
        setServices(data.services ?? []);
        if (data.services?.length > 0) {
          setServiceId(data.services[0].id);
        }
        setDate(initialDate ?? formatJerusalemDate());
        setTime(initialTime ?? "");
        setName("");
        setPhone("");
        setEmail("");
        setNotes("");
        setCustomerQuery("");
        setFormErrors({});
        setError("");
      })
      .catch(() => setError("שגיאה בטעינת נתונים"))
      .finally(() => setLoading(false));
  }, [open, initialDate, initialTime]);

  useEffect(() => {
    if (!open || customerQuery.length < 2) {
      setCustomerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/customers?q=${encodeURIComponent(customerQuery)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setCustomerResults(data.customers ?? []);
        setShowCustomerResults(true);
      } catch {
        /* ignore */
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [open, customerQuery]);

  const fetchSchedule = useCallback(
    async (d: string, sId: number, preferredTime?: string) => {
      setSlotsLoading(true);
      try {
        const res = await fetch(
          `/api/availability?date=${d}&serviceId=${sId}`
        );
        const data = await res.json();
        const slots: string[] = data.slots ?? [];
        const mergedSlots =
          preferredTime && !slots.includes(preferredTime)
            ? [...slots, preferredTime].sort()
            : slots;
        setTimeSlots(mergedSlots);
        setTime((prev) => {
          if (preferredTime) return preferredTime;
          if (prev && mergedSlots.includes(prev)) return prev;
          return mergedSlots[0] ?? "";
        });
      } catch {
        setError("שגיאה בטעינת שעות");
      } finally {
        setSlotsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (open && initialTime) {
      setTime(initialTime);
    }
  }, [open, initialTime]);

  useEffect(() => {
    if (open && date && serviceId) {
      fetchSchedule(date, serviceId, initialTime);
    }
  }, [open, date, serviceId, fetchSchedule, initialTime]);

  function selectCustomer(customer: {
    fullName: string;
    phone: string;
    email: string;
  }) {
    setName(customer.fullName);
    setPhone(customer.phone);
    setEmail(customer.email);
    setCustomerQuery(customer.fullName);
    setShowCustomerResults(false);
    setShowNewCustomer(true);
  }

  async function pickFromContacts() {
    setError("");
    if (!contactPickerSupported) {
      setError(
        "בחירה מאנשי קשר זמינה בעיקר באנדרoid — חפש לקוח קיים או הזן ידנית"
      );
      setShowNewCustomer(true);
      return;
    }

    const contact = await pickContactFromDevice();
    if (!contact) return;

    setName(contact.name);
    setPhone(contact.phone);
    if (contact.email) setEmail(contact.email);
    setCustomerQuery(contact.name || contact.phone);
    setShowCustomerResults(false);
    setShowNewCustomer(true);
  }

  function validateForm() {
    const errors: Record<string, string> = {};
    if (!serviceId) errors.service = "יש לבחור שירות";
    if (!date) errors.date = "יש לבחור תאריך";
    if (!time) errors.time = "יש לבחור שעה";
    if (name.length < 2) errors.name = "שם חייב להכיל לפחות 2 תווים";
    if (phone.length < 9) errors.phone = "מספר טלפון לא תקין";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "כתובת אימייל לא תקינה";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit() {
    if (!serviceId || !date || !time) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          date,
          time,
          customerName: name,
          customerPhone: phone,
          customerEmail: email.trim() || undefined,
          notes: notes.trim() || undefined,
          inspoIds: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה ביצירת התור");
        return;
      }

      onCreated({
        date: data.appointment?.date ?? date,
        status: data.appointment?.status ?? "confirmed",
      });
      onClose();
    } catch {
      setError("שגיאה ביצירת התור");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const displaySlots =
    time && !timeSlots.includes(time)
      ? [...timeSlots, time].sort()
      : timeSlots;

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true">
      <div className="admin-modal admin-modal--calmark">
        <div className="admin-modal__header">
          <h2 className="text-lg font-semibold text-text-primary">תור חדש</h2>
          <button
            type="button"
            onClick={onClose}
            className="admin-modal__close"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="admin-create-tabs px-5">
          <button
            type="button"
            className={cn(
              "admin-create-tab",
              tab === "details" && "admin-create-tab--active"
            )}
            onClick={() => setTab("details")}
          >
            פרטים
          </button>
          <button
            type="button"
            className={cn(
              "admin-create-tab",
              tab === "extra" && "admin-create-tab--active"
            )}
            onClick={() => setTab("extra")}
          >
            הגדרות נוספות
          </button>
        </div>

        <div className="admin-modal__body">
          {error && <ErrorMessage message={error} />}

          {loading ? (
            <p className="py-8 text-center text-text-secondary">טוען...</p>
          ) : tab === "details" ? (
            <div className="space-y-4">
              <div className="admin-sheet-form__row">
                <Input
                  label="תאריך"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTime("");
                  }}
                  error={formErrors.date}
                />
                <label className="admin-sheet-field admin-sheet-field--time">
                  <span className="admin-sheet-field__label">שעה</span>
                  <select
                    className="admin-sheet-field__input admin-sheet-field__input--time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={slotsLoading}
                  >
                    <option value="">בחר שעה</option>
                    {displaySlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  {formErrors.time && (
                    <span className="text-sm text-red-400">{formErrors.time}</span>
                  )}
                </label>
              </div>

              <label className="admin-sheet-field">
                <span className="admin-sheet-field__label">שירותים</span>
                <select
                  className="admin-sheet-field__input"
                  value={serviceId ?? ""}
                  onChange={(e) => {
                    setServiceId(Number(e.target.value));
                  }}
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                {formErrors.service && (
                  <span className="text-sm text-red-400">{formErrors.service}</span>
                )}
              </label>

              <div>
                <span className="admin-sheet-field__label">לקוח/ה</span>
                <div className="admin-create-customer-row mt-1">
                  <div className="relative flex-1">
                    <input
                      className="admin-sheet-field__input w-full"
                      value={customerQuery || name}
                      onChange={(e) => {
                        setCustomerQuery(e.target.value);
                        setName(e.target.value);
                      }}
                      placeholder="חיפוש לקוח..."
                      autoComplete="name"
                    />
                    {showCustomerResults && customerResults.length > 0 && (
                      <div className="customer-search-results">
                        {customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="customer-search-results__item"
                            onClick={() => selectCustomer(customer)}
                          >
                            <span>{customer.fullName}</span>
                            <span dir="ltr" className="text-text-muted">
                              {customer.phone}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="admin-create-add-btn"
                    aria-label="בחירה מאנשי קשר"
                    title="מאנשי קשר"
                    onClick={pickFromContacts}
                  >
                    <BookUser className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="admin-create-add-btn"
                    aria-label="לקוח חדש"
                    onClick={() => setShowNewCustomer((v) => !v)}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                {contactPickerSupported && (
                  <p className="mt-1.5 text-xs text-text-muted">
                    אפשר גם לבחור איש קשר ישירות מהטלפון
                  </p>
                )}
              </div>

              {(showNewCustomer || phone || name) && (
                <div className="space-y-3">
                  <Input
                    label="שם מלא"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={formErrors.name}
                    autoComplete="name"
                  />
                  <Input
                    label="טלפון"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={formErrors.phone}
                    dir="ltr"
                    className="text-left"
                    autoComplete="tel"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                label="אימייל (אופציונלי)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={formErrors.email}
                dir="ltr"
                className="text-left"
              />
              <Textarea
                label="הערות"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <Button
            className="mt-5 w-full"
            loading={submitting}
            disabled={!serviceId || !date || !time}
            onClick={submit}
          >
            שמירה
          </Button>
        </div>
      </div>
    </div>
  );
}
