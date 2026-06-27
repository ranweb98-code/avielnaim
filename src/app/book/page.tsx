"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Phone, Star } from "lucide-react";
import { TimeSlotGrid } from "@/components/TimeSlotGrid";
import { DatePickerBar } from "@/components/DatePickerBar";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Input, Textarea } from "@/components/Input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHero } from "@/components/PageHero";
import { ServiceList } from "@/components/ServiceList";
import { WeekDayStrip } from "@/components/WeekDayStrip";
import type { OccupiedBlock } from "@/lib/availability";
import { fetchWithCache, getCachedData } from "@/lib/fetch-cache";
import { formatJerusalemDate } from "@/lib/timezone";
import { BUSINESS_NAME, toWhatsAppUrl } from "@/lib/utils";

const PUBLIC_CACHE_KEY = "public-api";

type PublicData = {
  services: Service[];
  workingHours: WorkingHour[];
  blockedDates: string[];
  settings?: {
    bookingMode?: string;
    businessPhone?: string;
  };
};

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
    slotInterval: 5,
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
    function applyPublicData(data: PublicData) {
      setServices(data.services ?? []);
      setWorkingHours(data.workingHours ?? []);
      setBlockedDates(data.blockedDates ?? []);
      setBookingMode(data.settings?.bookingMode ?? "self");
      setBusinessPhone(data.settings?.businessPhone ?? "");
      if (data.services?.length > 0) {
        setServiceId(data.services[0].id);
      }
      setDate(minDate);
    }

    const cached = getCachedData<PublicData>(PUBLIC_CACHE_KEY);
    if (cached) {
      applyPublicData(cached);
      setLoading(false);
    }

    fetchWithCache<PublicData>(PUBLIC_CACHE_KEY, "/api/public")
      .then(applyPublicData)
      .catch(() => {
        if (!cached) setError("שגיאה בטעינת נתונים");
      })
      .finally(() => setLoading(false));
  }, [minDate]);

  const fetchSchedule = useCallback(async (d: string, sId: number) => {
    setSlotsLoading(true);
    setSchedule({
      slots: [],
      occupied: [],
      workingHours: null,
      slotInterval: 5,
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
        slotInterval: data.slotInterval ?? 5,
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
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`tel:${businessPhone.replace(/-/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-yellow px-6 py-3 font-medium text-black"
                >
                  <Phone className="h-5 w-5" />
                  {businessPhone}
                </a>
                <a
                  href={toWhatsAppUrl(
                    businessPhone,
                    "שלום, אשמח לקבוע תור"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
                  aria-label="שליחת הודעה בוואטסאפ"
                >
                  <svg
                    className="h-5 w-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              </div>
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
        imagePriority={false}
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
              {formErrors.date && (
                <p className="mt-2 text-sm text-red-400">{formErrors.date}</p>
              )}
            </section>

            {date && serviceId && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-text-primary">
                  בחר שעה
                </h2>
                {schedule.isClosed ? (
                  <p className="py-4 text-center text-sm text-text-secondary">
                    אין שעות פנויות לתאריך זה
                  </p>
                ) : (
                  <TimeSlotGrid
                    slots={schedule.slots}
                    selectedTime={time}
                    onSelect={setTime}
                    loading={slotsLoading}
                  />
                )}
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
