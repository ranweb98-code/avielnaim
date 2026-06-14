"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, MoreHorizontal, Star } from "lucide-react";
import { Button } from "@/components/Button";
import { DateScroller } from "@/components/DateScroller";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Input, Textarea } from "@/components/Input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ServiceList } from "@/components/ServiceList";
import { TimeSlotGrid } from "@/components/TimeSlotGrid";
import { HERO_IMAGE } from "@/lib/assets";
import { formatJerusalemDate, nowInJerusalem } from "@/lib/timezone";

type Service = {
  id: number;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
};

export default function BookPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [businessName, setBusinessName] = useState("Barber Noir");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [styleNotes, setStyleNotes] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);
  const minDate = useMemo(() => formatJerusalemDate(nowInJerusalem()), []);

  useEffect(() => {
    fetch("/api/public")
      .then((r) => r.json())
      .then((data) => {
        setServices(data.services ?? []);
        setBusinessName(data.settings?.businessName ?? "Barber Noir");
        if (data.services?.length > 0) {
          setServiceId(data.services[0].id);
        }
        setDate(minDate);
      })
      .catch(() => setError("שגיאה בטעינת נתונים"))
      .finally(() => setLoading(false));
  }, [minDate]);

  const fetchSlots = useCallback(async (d: string, sId: number) => {
    setSlotsLoading(true);
    setSlots([]);
    try {
      const res = await fetch(
        `/api/availability?date=${d}&serviceId=${sId}`
      );
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setError("שגיאה בטעינת שעות פנויות");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (date && serviceId) {
      fetchSlots(date, serviceId);
      setTime("");
    }
  }, [date, serviceId, fetchSlots]);

  function validateForm() {
    const errors: Record<string, string> = {};
    if (!serviceId) errors.service = "יש לבחור שירות";
    if (!date) errors.date = "יש לבחור תאריך";
    if (!time) errors.time = "יש לבחור שעה";
    if (name.length < 2) errors.name = "שם חייב להכיל לפחות 2 תווים";
    if (phone.length < 9) errors.phone = "מספר טלפון לא תקין";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "כתובת אימייל לא תקינה";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitBooking() {
    if (!serviceId || !date || !time) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setError("");

    const notesValue = styleNotes.trim() || undefined;

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          date,
          time,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          notes: notesValue,
          inspoIds: [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה בקביעת התור");
        return;
      }

      setConfirmed(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("שגיאה בקביעת התור");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner label="טוען..." />;

  if (confirmed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-bg-card">
          <Check className="h-8 w-8 text-gold-start" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">
          התור נקבע בהצלחה!
        </h1>
        <p className="mt-3 text-text-secondary">
          שלחנו אימייל אישור ל-{email}
        </p>
        <div className="card-app mt-6 space-y-2 p-4 text-sm text-right">
          <p>
            <strong>שירות:</strong> {selectedService?.name}
          </p>
          <p>
            <strong>תאריך:</strong> {date} · {time}
          </p>
          <p className="text-text-muted">התור ממתין לאישור הספר</p>
        </div>
        <Link href="/" className="mt-8 block">
          <Button variant="secondary" className="w-full">
            חזרה לדף הבית
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-bg-app pb-8">
      {/* Hero header — Luxe screen 3 */}
      <div className="relative h-64 overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt={businessName}
          fill
          priority
          className="object-cover object-top grayscale"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-app/80 via-transparent to-bg-app" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-safe">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-text-primary backdrop-blur-sm"
            aria-label="חזרה"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-text-primary backdrop-blur-sm"
            aria-label="תפריט"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative mx-auto max-w-lg px-4">
        {/* Profile card overlapping hero */}
        <div className="-mt-10 mb-6">
          <span className="badge-gold">ספר מקצועי</span>
          <h1 className="mt-3 text-2xl font-bold text-text-primary">
            {businessName}
          </h1>
          <div className="mt-2 flex items-center gap-1 text-sm text-text-secondary">
            <Star className="h-4 w-4 fill-gold-start text-gold-start" />
            <span className="font-medium text-text-primary">4.9</span>
            <span className="text-text-muted">(205 ביקורות)</span>
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Services */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-text-primary">
            בחר שירות
          </h2>
          <ServiceList
            services={services}
            selectedId={serviceId}
            onSelect={setServiceId}
          />
          {formErrors.service && (
            <p className="mt-2 text-sm text-red-400">{formErrors.service}</p>
          )}
        </section>

        {/* Date scroller */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-text-primary">
            זמין היום
          </h2>
          <DateScroller
            selectedDate={date}
            onSelect={setDate}
            startDate={minDate}
            daysCount={14}
          />
          {formErrors.date && (
            <p className="mt-2 text-sm text-red-400">{formErrors.date}</p>
          )}
        </section>

        {/* Time slots */}
        {date && serviceId && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-text-primary">
              בחר שעה
            </h2>
            <TimeSlotGrid
              slots={slots}
              selectedTime={time}
              onSelect={setTime}
              loading={slotsLoading}
            />
            {formErrors.time && (
              <p className="mt-2 text-sm text-red-400">{formErrors.time}</p>
            )}
          </section>
        )}

        {/* Style notes — optional inspo replacement */}
        <section className="mb-8">
          <h2 className="mb-1 text-lg font-semibold text-text-primary">
            סגנון רצוי
          </h2>
          <p className="mb-3 text-sm text-text-secondary">
            אופציונלי — תאר את הסגנון שאתה מחפש
          </p>
          <Textarea
            value={styleNotes}
            onChange={(e) => setStyleNotes(e.target.value)}
            placeholder="למשל: פייד נמוך, undercut, זקן מסודר..."
            rows={3}
          />
        </section>

        {/* Contact details */}
        <section className="mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            פרטים אישיים
          </h2>
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
            autoComplete="tel"
            dir="ltr"
            className="text-left"
          />
          <Input
            label="אימייל"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={formErrors.email}
            autoComplete="email"
            dir="ltr"
            className="text-left"
          />
        </section>

        {/* Summary + CTA */}
        {selectedService && date && time && (
          <div className="card-app mb-4 space-y-1 p-4 text-sm text-text-secondary">
            <p>
              <strong className="text-text-primary">שירות:</strong>{" "}
              {selectedService.name}
            </p>
            <p>
              <strong className="text-text-primary">תאריך:</strong> {date}
            </p>
            <p>
              <strong className="text-text-primary">שעה:</strong> {time}
            </p>
          </div>
        )}

        <Button
          className="min-h-14 w-full text-base"
          loading={submitting}
          disabled={!serviceId || !date || !time}
          onClick={submitBooking}
        >
          אשר תור
        </Button>
      </div>
    </div>
  );
}
