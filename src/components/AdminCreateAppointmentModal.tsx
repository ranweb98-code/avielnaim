"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/Button";
import { ContactPickerButton } from "@/components/ContactPickerButton";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Input, Textarea } from "@/components/Input";
import { ServiceCarousel } from "@/components/ServiceCarousel";
import { TimeSlotGrid } from "@/components/TimeSlotGrid";
import { cn } from "@/lib/cn";
import { isIOSDevice } from "@/lib/device";
import {
  type PickedContact,
} from "@/lib/contact-picker";
import {
  filterAdminBookingServices,
  findHaircutService,
} from "@/lib/services";
import { formatJerusalemDate, parseJerusalemDate } from "@/lib/timezone";
import { ensureIsraeliLocalPhone } from "@/lib/phone";
import { format } from "date-fns";

function formatAdminDateLabel(dateStr: string) {
  if (!dateStr) return "בחר תאריך";
  return format(parseJerusalemDate(dateStr), "dd/MM/yyyy");
}

const ADMIN_CREATE_PHONE_INPUT_ID = "admin-create-phone";
const ADMIN_CREATE_NAME_INPUT_ID = "admin-create-name";
const ADMIN_CREATE_CONTACT_FORM_ID = "admin-create-contact-form";

function readAdminCreateContactInput(id: string) {
  return document.getElementById(id) as HTMLInputElement | null;
}

function fillAdminCreateContactFields(fields: {
  name: string;
  phone: string;
  email?: string;
}) {
  const normalizedPhone = ensureIsraeliLocalPhone(fields.phone);
  const nameEl = readAdminCreateContactInput(ADMIN_CREATE_NAME_INPUT_ID);
  const phoneEl = readAdminCreateContactInput(ADMIN_CREATE_PHONE_INPUT_ID);
  const emailEl = document.querySelector<HTMLInputElement>(
    `#${ADMIN_CREATE_CONTACT_FORM_ID} input[name="email"]`
  );
  if (nameEl) nameEl.value = fields.name;
  if (phoneEl) phoneEl.value = normalizedPhone;
  if (emailEl && fields.email) emailEl.value = fields.email;
}

function readAdminCreateContactFields(fallback: {
  name: string;
  phone: string;
  email: string;
}) {
  const nameEl = readAdminCreateContactInput(ADMIN_CREATE_NAME_INPUT_ID);
  const phoneEl = readAdminCreateContactInput(ADMIN_CREATE_PHONE_INPUT_ID);
  const emailEl = document.querySelector<HTMLInputElement>(
    `#${ADMIN_CREATE_CONTACT_FORM_ID} input[name="email"]`
  );
  return {
    name: (nameEl?.value ?? fallback.name).trim(),
    phone: ensureIsraeliLocalPhone(phoneEl?.value ?? fallback.phone),
    email: (emailEl?.value ?? fallback.email).trim(),
  };
}

type Service = {
  id: number;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
};

type SlotFit = {
  maxFitDuration: number;
  catalogDuration: number;
  fitsFully: boolean;
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
  const [useNativeTimePicker, setUseNativeTimePicker] = useState(false);
  const [slotFit, setSlotFit] = useState<SlotFit | null>(null);
  const [slotFitLoading, setSlotFitLoading] = useState(false);
  const [showReducedConfirm, setShowReducedConfirm] = useState(false);
  const [contactFormGeneration, setContactFormGeneration] = useState(0);

  useEffect(() => {
    setUseNativeTimePicker(isIOSDevice());
  }, []);

  useEffect(() => {
    if (!open) return;

    setContactFormGeneration((g) => g + 1);
    setLoading(true);
    setTab("details");
    fetch("/api/public")
      .then((r) => r.json())
      .then((data) => {
        const allServices: Service[] = data.services ?? [];
        const bookingServices = filterAdminBookingServices(allServices);
        setServices(bookingServices);
        const defaultService = findHaircutService(bookingServices);
        if (defaultService) {
          setServiceId(defaultService.id);
        } else if (bookingServices.length > 0) {
          setServiceId(bookingServices[0].id);
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
        setSlotFit(null);
        setShowReducedConfirm(false);
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
    const normalizedPhone = ensureIsraeliLocalPhone(customer.phone);
    setName(customer.fullName);
    setPhone(normalizedPhone);
    setEmail(customer.email);
    setCustomerQuery(customer.fullName);
    setShowCustomerResults(false);
    requestAnimationFrame(() => {
      fillAdminCreateContactFields({
        name: customer.fullName,
        phone: normalizedPhone,
        email: customer.email,
      });
    });
  }

  function applyPickedContact(contact: PickedContact) {
    const normalizedPhone = ensureIsraeliLocalPhone(contact.phone);
    setName(contact.name);
    setPhone(normalizedPhone);
    if (contact.email) setEmail(contact.email);
    setCustomerQuery(contact.name || normalizedPhone);
    setShowCustomerResults(false);
    requestAnimationFrame(() => {
      fillAdminCreateContactFields({
        name: contact.name,
        phone: normalizedPhone,
        email: contact.email,
      });
    });
  }

  function handleIOSContactFallback() {
    window.setTimeout(() => {
      const nameInput = document.getElementById(ADMIN_CREATE_NAME_INPUT_ID);
      nameInput?.focus();
      nameInput?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  }

  useEffect(() => {
    if (!open || !date || !serviceId || !time) {
      setSlotFit(null);
      return;
    }

    let cancelled = false;
    setSlotFitLoading(true);

    fetch(
      `/api/admin/slot-fit?date=${encodeURIComponent(date)}&serviceId=${serviceId}&time=${encodeURIComponent(time)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setSlotFit(data);
      })
      .catch(() => {
        if (!cancelled) setSlotFit(null);
      })
      .finally(() => {
        if (!cancelled) setSlotFitLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, date, serviceId, time]);

  function validateForm() {
    const contact = readAdminCreateContactFields({ name, phone, email });
    setName(contact.name);
    setPhone(contact.phone);
    setEmail(contact.email);

    const errors: Record<string, string> = {};
    if (!serviceId) errors.service = "יש לבחור שירות";
    if (!date) errors.date = "יש לבחור תאריך";
    if (!time) errors.time = "יש לבחור שעה";
    if (contact.name.length < 2) errors.name = "שם חייב להכיל לפחות 2 תווים";
    if (contact.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "מספר טלפון לא תקין";
    }
    if (
      contact.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
    ) {
      errors.email = "כתובת אימייל לא תקינה";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function createAppointment(durationOverride?: number) {
    if (!serviceId || !date || !time) return;

    const contact = readAdminCreateContactFields({ name, phone, email });
    setName(contact.name);
    setPhone(contact.phone);
    setEmail(contact.email);

    setSubmitting(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        serviceId,
        date,
        time,
        customerName: contact.name,
        customerPhone: contact.phone,
        customerEmail: contact.email || undefined,
        notes: notes.trim() || undefined,
        inspoIds: [],
      };

      if (durationOverride !== undefined) {
        payload.serviceDuration = durationOverride;
      }

      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      setShowReducedConfirm(false);
    }
  }

  async function submit() {
    if (!serviceId || !date || !time) return;
    if (!validateForm()) return;

    if (slotFit && !slotFit.fitsFully) {
      if (slotFit.maxFitDuration < 5) {
        setError("אין מספיק זמן לקביעת תור במועד זה");
        return;
      }
      setShowReducedConfirm(true);
      return;
    }

    await createAppointment();
  }

  async function confirmReducedDuration() {
    if (!slotFit) return;
    await createAppointment(slotFit.maxFitDuration);
  }

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  if (!open) return null;

  const displaySlots =
    time && !timeSlots.includes(time)
      ? [...timeSlots, time].sort()
      : timeSlots;

  return (
    <>
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
            <div className="admin-create-form space-y-4">
              <label className="admin-sheet-field">
                <span className="admin-sheet-field__label">תאריך</span>
                <div className="admin-create-date-wrap">
                  <span className="admin-create-date-display" aria-hidden="true">
                    {formatAdminDateLabel(date)}
                  </span>
                  <input
                    type="date"
                    className="admin-create-date-native"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setTime("");
                    }}
                    aria-label="בחירת תאריך"
                  />
                </div>
                {formErrors.date && (
                  <span className="text-sm text-red-400">{formErrors.date}</span>
                )}
              </label>

              <label className="admin-sheet-field">
                <span className="admin-sheet-field__label">שעה</span>
                {slotsLoading ? (
                  <div className="admin-sheet-field__input animate-pulse bg-bg-card-hover" />
                ) : displaySlots.length === 0 ? (
                  <p className="py-2 text-sm text-text-secondary">
                    אין שעות פנויות לתאריך זה
                  </p>
                ) : useNativeTimePicker ? (
                  <select
                    className="admin-sheet-field__input"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    aria-label="בחירת שעה"
                  >
                    {displaySlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1">
                    <TimeSlotGrid
                      slots={displaySlots}
                      selectedTime={time}
                      onSelect={setTime}
                      loading={false}
                    />
                  </div>
                )}
                {formErrors.time && (
                  <span className="mt-1 block text-sm text-red-400">
                    {formErrors.time}
                  </span>
                )}
                {slotFit &&
                  !slotFitLoading &&
                  !slotFit.fitsFully &&
                  slotFit.maxFitDuration >= 5 && (
                    <p className="mt-2 text-sm text-amber-600">
                      אין מספיק זמן ל{selectedService?.name ?? "שירות"} (
                      {slotFit.catalogDuration} דק&apos;). ניתן לקבוע תור של{" "}
                      {slotFit.maxFitDuration} דק&apos; בלבד.
                    </p>
                  )}
              </label>

              <ServiceCarousel
                services={services}
                selectedId={serviceId}
                onSelect={setServiceId}
                label="סוג תספורת"
              />
              {formErrors.service && (
                <span className="text-sm text-red-400">{formErrors.service}</span>
              )}

              <div>
                <span className="admin-sheet-field__label">לקוח/ה</span>
                <ContactPickerButton
                  className="mt-2 w-full"
                  onPicked={applyPickedContact}
                  onIOSFallback={handleIOSContactFallback}
                />
                <form
                  id={ADMIN_CREATE_CONTACT_FORM_ID}
                  className="mt-2 space-y-3"
                  autoComplete="on"
                  onSubmit={(e) => e.preventDefault()}
                >
                <div className="admin-create-customer-row">
                  <div className="admin-create-customer-search">
                    <input
                      className="admin-sheet-field__input w-full"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="חיפוש לקוח..."
                      autoComplete="off"
                      name="customer-search"
                      type="search"
                      enterKeyHint="search"
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
                    aria-label="לקוח חדש"
                    onClick={() => {
                      setCustomerQuery("");
                      setName("");
                      setPhone("");
                      setEmail("");
                      setShowCustomerResults(false);
                      fillAdminCreateContactFields({
                        name: "",
                        phone: "",
                        email: "",
                      });
                      document
                        .getElementById(ADMIN_CREATE_NAME_INPUT_ID)
                        ?.focus();
                    }}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                  <Input
                    key={`admin-create-name-${contactFormGeneration}`}
                    id={ADMIN_CREATE_NAME_INPUT_ID}
                    label="שם מלא"
                    defaultValue=""
                    onChange={(e) => setName(e.target.value)}
                    error={formErrors.name}
                    autoComplete="name"
                    name="name"
                  />
                  <Input
                    key={`admin-create-phone-${contactFormGeneration}`}
                    id={ADMIN_CREATE_PHONE_INPUT_ID}
                    label="טלפון"
                    type="tel"
                    inputMode="tel"
                    defaultValue=""
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={(e) => {
                      const normalized = ensureIsraeliLocalPhone(
                        e.currentTarget.value
                      );
                      e.currentTarget.value = normalized;
                      setPhone(normalized);
                    }}
                    error={formErrors.phone}
                    dir="ltr"
                    className="text-left"
                    autoComplete="tel"
                    name="tel"
                  />
                  <Input
                    key={`admin-create-email-${contactFormGeneration}`}
                    label="אימייל (אופציונלי)"
                    type="email"
                    defaultValue=""
                    onChange={(e) => setEmail(e.target.value)}
                    error={formErrors.email}
                    autoComplete="email"
                    name="email"
                    dir="ltr"
                    className="text-left"
                  />
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
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
            disabled={!serviceId || !date || !time || slotFitLoading}
            onClick={submit}
          >
            שמירה
          </Button>
        </div>
      </div>
    </div>

    {showReducedConfirm && slotFit && (
      <div
        className="admin-modal-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reduced-duration-title"
      >
        <button
          type="button"
          className="admin-sheet-backdrop"
          aria-label="סגור"
          onClick={() => setShowReducedConfirm(false)}
        />
        <div className="admin-move-confirm-modal admin-move-confirm-modal--inline">
          <p
            id="reduced-duration-title"
            className="admin-move-confirm-modal__text"
          >
            אין מספיק זמן ל
            {selectedService?.name ?? "שירות"} ({slotFit.catalogDuration}{" "}
            דק&apos;). ניתן לקבוע תור של {slotFit.maxFitDuration} דק&apos;
            בלבד. האם אתה בטוח?
          </p>
          <div className="admin-move-confirm-modal__actions">
            <button
              type="button"
              className="admin-cal__confirm-btn admin-cal__confirm-btn--yes"
              disabled={submitting}
              onClick={() => void confirmReducedDuration()}
            >
              {submitting ? "..." : "כן, קבע תור"}
            </button>
            <button
              type="button"
              className="admin-cal__confirm-btn admin-cal__confirm-btn--no"
              disabled={submitting}
              onClick={() => setShowReducedConfirm(false)}
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
