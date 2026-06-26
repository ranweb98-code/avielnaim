"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { DayScheduleGrid } from "@/components/DayScheduleGrid";
import { DatePickerBar } from "@/components/DatePickerBar";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Input, Textarea } from "@/components/Input";
import { ServiceList } from "@/components/ServiceList";
import { WeekDayStrip } from "@/components/WeekDayStrip";
import type { OccupiedBlock } from "@/lib/availability";
import { formatJerusalemDate } from "@/lib/timezone";

type Service = {
  id: number;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
};

type WorkingHour = {
  dayOfWeek: number;
  isOpen: boolean;
};

type AdminCreateAppointmentModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function AdminCreateAppointmentModal({
  open,
  onClose,
  onCreated,
}: AdminCreateAppointmentModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState(formatJerusalemDate());
  const [time, setTime] = useState("");
  const [schedule, setSchedule] = useState({
    slots: [] as string[],
    occupied: [] as OccupiedBlock[],
    workingHours: null as { startTime: string; endTime: string } | null,
    slotInterval: 5,
    isClosed: true,
  });
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

  const minDate = formatJerusalemDate();
  const selectedService = services.find((s) => s.id === serviceId);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    fetch("/api/public")
      .then((r) => r.json())
      .then((data) => {
        setServices(data.services ?? []);
        setWorkingHours(data.workingHours ?? []);
        setBlockedDates(data.blockedDates ?? []);
        if (data.services?.length > 0) {
          setServiceId(data.services[0].id);
        }
        setDate(minDate);
        setTime("");
        setName("");
        setPhone("");
        setEmail("");
        setNotes("");
        setFormErrors({});
        setError("");
      })
      .catch(() => setError("שגיאה בטעינת נתונים"))
      .finally(() => setLoading(false));
  }, [open, minDate]);

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

  function selectCustomer(customer: {
    fullName: string;
    phone: string;
    email: string;
  }) {
    setName(customer.fullName);
    setPhone(customer.phone);
    setEmail(customer.email);
    setCustomerQuery("");
    setShowCustomerResults(false);
  }

  const fetchSchedule = useCallback(async (d: string, sId: number) => {
    setSlotsLoading(true);
    try {
      const res = await fetch(
        `/api/availability?date=${d}&serviceId=${sId}`
      );
      const data = await res.json();
      setSchedule({
        slots: data.slots ?? [],
        occupied: data.occupied ?? [],
        workingHours: data.workingHours ?? null,
        slotInterval: data.slotInterval ?? 5,
        isClosed: data.isClosed ?? false,
      });
    } catch {
      setError("שגיאה בטעינת שעות");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && date && serviceId) {
      fetchSchedule(date, serviceId);
      setTime("");
    }
  }, [open, date, serviceId, fetchSchedule]);

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

      onCreated();
      onClose();
    } catch {
      setError("שגיאה ביצירת התור");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true">
      <div className="admin-modal">
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

        <div className="admin-modal__body">
          {error && <ErrorMessage message={error} />}

          {loading ? (
            <p className="py-8 text-center text-text-secondary">טוען...</p>
          ) : (
            <div className="space-y-5">
              <section>
                <h3 className="mb-2 text-sm font-medium text-text-primary">
                  שירות
                </h3>
                <ServiceList
                  services={services}
                  selectedId={serviceId}
                  onSelect={setServiceId}
                />
                {formErrors.service && (
                  <p className="mt-1 text-sm text-red-400">{formErrors.service}</p>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-medium text-text-primary">
                  תאריך
                </h3>
                <DatePickerBar
                  selectedDate={date}
                  onSelect={setDate}
                  workingHours={workingHours}
                  blockedDates={blockedDates}
                  minDate={minDate}
                  className="mb-3"
                />
                <WeekDayStrip
                  selectedDate={date}
                  onSelect={setDate}
                  workingHours={workingHours}
                  blockedDates={blockedDates}
                  minDate={minDate}
                />
              </section>

              {date && serviceId && (
                <section>
                  <DayScheduleGrid
                    date={date}
                    selectedTime={time}
                    onSelect={setTime}
                    occupied={schedule.occupied}
                    workingHours={schedule.workingHours}
                    serviceDurationMin={selectedService?.durationMin ?? 30}
                    isClosed={schedule.isClosed}
                    slotInterval={schedule.slotInterval}
                    loading={slotsLoading}
                  />
                  {formErrors.time && (
                    <p className="mt-1 text-sm text-red-400">{formErrors.time}</p>
                  )}
                </section>
              )}

              <section className="space-y-3">
                <div className="relative">
                  <Input
                    label="חיפוש לקוח קיים"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="שם או טלפון..."
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
                <Input
                  label="שם לקוח"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={formErrors.name}
                />
                <Input
                  label="טלפון"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={formErrors.phone}
                  dir="ltr"
                  className="text-left"
                />
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
                  rows={2}
                />
              </section>

              <Button
                className="w-full"
                loading={submitting}
                disabled={!serviceId || !date || !time}
                onClick={submit}
              >
                צור תור
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
