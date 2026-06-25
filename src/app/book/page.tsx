"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Phone, Star } from "lucide-react";
import { DayScheduleGrid } from "@/components/DayScheduleGrid";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Input, Textarea } from "@/components/Input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHero } from "@/components/PageHero";
import { ServiceList } from "@/components/ServiceList";
import { WeekDayStrip } from "@/components/WeekDayStrip";
import type { OccupiedBlock } from "@/lib/availability";
import { formatJerusalemDate } from "@/lib/timezone";
import { BUSINESS_NAME } from "@/lib/utils";

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

type ScheduleData = {
  slots: string[];
  occupied: OccupiedBlock[];
  workingHours: { startTime: string; endTime: string } | null;
  slotInterval: number;
  isClosed: boolean;
};

export default function BookPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [bookingMode, setBookingMode] = useState("self");
  const [businessPhone, setBusinessPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [schedule, setSchedule] = useState<ScheduleData>({
    slots: [],
    occupied: [],
    workingHours: null,
    slotInterval: 30,
    isClosed: true,
  });
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [styleNotes, setStyleNotes] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);
  const minDate = formatJerusalemDate();

  useEffect(() => {
    fetch("/api/public")
      .then((r) => r.json())
      .then((data) => {
        setServices(data.services ?? []);
        setWorkingHours(data.workingHours ?? []);
        setBlockedDates(data.blockedDates ?? []);
        setBookingMode(data.settings?.bookingMode ?? "self");
        setBusinessPhone(data.settings?.businessPhone ?? "");
        if (data.services?.length > 0) {
          setServiceId(data.services[0].id);
        }
        setDate(minDate);
      })
      .catch(() => setError("שגיאה בטעינת נתונים"))
      .finally(() => setLoading(false));
  }, [minDate]);

  const fetchSchedule = useCallback(async (d: string, sId: number) => {
    setSlotsLoading(true);
    setSchedule({
      slots: [],
      occupied: [],
      workingHours: null,
      slotInterval: 30,
      isClosed: true,
    });
    try {
      const res = await fetch(
        `/api/availability?date=${d}&serviceId=${sId}`
      );
      const data = await res.json();
      setSchedule({
        slots: data.slots ?? [],
        occupied: data.occupied ?? [],
        workingHours: data.workingHours ?? null,
        slotInterval: data.slotInterval ?? 30,
        isClosed: data.isClosed ?? false,
      });
    } catch {
      setError("שגיאה בטעינת שעות פנויות");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (date && serviceId) {
      fetchSchedule(date, serviceId);
      setTime("");
    }
  }, [date, serviceId, fetchSchedule]);

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

  async function submitBooking() {
    if (!serviceId || !date || !time) return;
    if (!validateForm()) return;

    setSubmitting(true);
    setError("");

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
          customerEmail: email.trim() || undefined,
          notes: styleNotes.trim() || undefined,
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
      <>
        <PageHero
          businessName={BUSINESS_NAME}
          showBack
          backHref="/"
          bottomContent={
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-yellow">
                <Check className="h-8 w-8 text-black" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                התור נקבע בהצלחה!
              </h1>
              {email.trim() ? (
                <p className="mt-2 text-sm text-white/70">
                  שלחנו אימייל אישור ל-{email.trim()}
                </p>
              ) : (
                <p className="mt-2 text-sm text-white/70">
                  התור נקלט וממתין לאישור הספר
                </p>
              )}
            </div>
          }
        />
        <div className="site-container max-w-xl py-8">
          <div className="card-app space-y-2 p-4 text-sm">
            <p>
              <strong>שירות:</strong> {selectedService?.name}
            </p>
            <p>
              <strong>תאריך:</strong> {date} · {time}
            </p>
            <p className="text-text-muted">התור ממתין לאישור הספר</p>
          </div>
          <Link href="/" className="mt-6 block">
            <Button variant="secondary" className="w-full">
              חזרה לדף הבית
            </Button>
          </Link>
        </div>
      </>
    );
  }

  if (bookingMode === "admin") {
    return (
      <>
        <PageHero
          businessName={BUSINESS_NAME}
          showBack
          backHref="/"
          bottomContent={
            <h1 className="text-2xl font-bold text-white">קביעת תור</h1>
          }
        />
        <div className="site-container max-w-xl py-12 text-center">
          <div className="card-app space-y-4 p-6">
            <p className="text-lg font-medium text-text-primary">
              כרגע לא ניתן לקבוע תור אונליין
            </p>
            <p className="text-sm text-text-secondary">
              אם ברצונך לקבוע תור, יש להתקשר לבעל העסק
            </p>
            {businessPhone && (
              <a
                href={`tel:${businessPhone.replace(/-/g, "")}`}
                className="inline-flex items-center gap-2 rounded-xl bg-accent-yellow px-6 py-3 font-medium text-black"
              >
                <Phone className="h-5 w-5" />
                {businessPhone}
              </a>
            )}
          </div>
          <Link href="/" className="mt-4 block">
            <Button variant="secondary" className="w-full">
              חזרה לדף הבית
            </Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        businessName={BUSINESS_NAME}
        showBack
        backHref="/"
        bottomContent={
          <div>
            <span className="badge-gold">ספר מקצועי</span>
            <h1 className="brand-name brand-name--hero mt-3">
              {BUSINESS_NAME}
            </h1>
            <div className="mt-2 flex items-center gap-1 text-sm text-white/80">
              <Star className="h-4 w-4 fill-accent-yellow text-accent-yellow" />
              <span className="font-medium text-white">4.9</span>
              <span className="text-white/50">(205 ביקורות)</span>
            </div>
          </div>
        }
      />

      <div className="site-container pb-8 pt-6">
        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        <div className="md:grid md:grid-cols-2 md:items-start md:gap-10">
          <div className="space-y-6">
            <section>
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

            <section>
              <h2 className="mb-3 text-lg font-semibold text-text-primary">
                קביעת תור
              </h2>
              <WeekDayStrip
                selectedDate={date}
                onSelect={setDate}
                workingHours={workingHours}
                blockedDates={blockedDates}
                minDate={minDate}
              />
              {formErrors.date && (
                <p className="mt-2 text-sm text-red-400">{formErrors.date}</p>
              )}
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
                  loading={slotsLoading}
                />
                {formErrors.time && (
                  <p className="mt-2 text-sm text-red-400">{formErrors.time}</p>
                )}
              </section>
            )}
          </div>

          <div className="mt-8 space-y-8 md:mt-0 md:sticky md:top-24">
            <section>
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

            <section className="space-y-4">
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
                label="אימייל (אופציונלי)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={formErrors.email}
                autoComplete="email"
                dir="ltr"
                className="text-left"
              />
            </section>

            {selectedService && date && time && (
              <div className="card-app space-y-1 p-4 text-sm text-text-secondary">
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
              המשך
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
