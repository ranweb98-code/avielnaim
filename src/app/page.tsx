import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, Phone, Scissors, Star } from "lucide-react";
import { Button } from "@/components/Button";
import { HERO_IMAGE } from "@/lib/assets";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import {
  DAY_NAMES,
  formatDuration,
  formatPrice,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [services, settings, workingHours] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    getSettingsMap(),
    prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
  ]);

  const businessName = settings.businessName ?? "Barber Noir";
  const phone = settings.businessPhone ?? "";
  const address = settings.businessAddress ?? "";

  return (
    <>
      {/* Welcome Hero */}
      <section className="hero-section relative -mt-[env(safe-area-inset-top,0px)] min-h-[100svh] min-h-[100dvh] pt-[env(safe-area-inset-top,0px)] md:mt-0 md:min-h-0 md:bg-bg-app md:pt-0">
        {/* ── Mobile ── */}
        <div className="relative flex min-h-[calc(100svh-env(safe-area-inset-top,0px))] min-h-[calc(100dvh-env(safe-area-inset-top,0px))] flex-col md:hidden">
          <div className="hero-mobile__media">
            <Image
              src={HERO_IMAGE}
              alt={businessName}
              fill
              priority
              quality={95}
              className="object-cover"
              sizes="100vw"
            />
            <div className="hero-overlay-luxe absolute inset-0" aria-hidden />
          </div>

          <div className="relative z-10 flex flex-1 flex-col">
            <div className="hero-top-bar site-container">
              <div className="brand-lockup">
                <span className="brand-lockup-name">Aviel Naim</span>
              </div>
            </div>

            <div className="hero-bottom-bar site-container">
              <Link href="/book" className="block">
                <Button className="min-h-14 w-full text-base">
                  <Scissors className="h-5 w-5" />
                  התחל
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Desktop ── */}
        <div className="hero-desktop hidden md:grid">
          <div className="hero-desktop__copy">
            <p className="hero-eyebrow">מספרה פרימיום · תל אביב</p>
            <h1 className="hero-title">Aviel Naim</h1>
            <p className="hero-lead">
              סגנון מדויק, תור בקליק — המספרה שלך מחכה.
            </p>
            <p className="hero-desc">
              בחר שירות, תאריך ושעה — בקלות. ללא שיחות, ללא המתנה.
            </p>
            <div className="hero-actions">
              <Link href="/book">
                <Button className="min-h-14 px-8 text-base">
                  <Scissors className="h-5 w-5" />
                  קביעת תור
                </Button>
              </Link>
            </div>
          </div>

          <div className="hero-image-frame">
            <Image
              src={HERO_IMAGE}
              alt={businessName}
              fill
              priority
              quality={95}
              className="object-cover"
              sizes="(min-width: 768px) 480px, 100vw"
            />
          </div>
        </div>
      </section>

      <div className="bg-bg-app">
      <div className="site-container space-y-10 py-8 md:space-y-14 md:py-14">
        <div className="md:hidden">
          <h2 className="text-2xl font-bold text-text-primary">
            שדרג את הסגנון שלך
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            בחר שירות, תאריך ושעה — בקלות
          </p>
        </div>

        {/* Barber card — mobile only */}
        <div className="card-app flex items-center gap-4 p-4 md:hidden">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
            <Image
              src={HERO_IMAGE}
              alt={businessName}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text-primary">{businessName}</p>
            <div className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
              <Star className="h-4 w-4 fill-gold-start text-gold-start" />
              <span>4.9</span>
              <span className="text-text-muted">· מספרה פרימיום</span>
            </div>
          </div>
          <Link href="/book">
            <Button className="shrink-0 px-4 text-sm">קבע תור</Button>
          </Link>
        </div>

        {/* Services */}
        <section>
          <div className="section-heading">
            <h3 className="section-heading__title">השירותים שלנו</h3>
            <p className="section-heading__sub">מחירים שקופים, תוצאה מדויקת</p>
          </div>
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="card-app card-app-hover flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <h4 className="font-medium text-text-primary">
                    {service.name}
                  </h4>
                  {service.description && (
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {service.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    {formatDuration(service.durationMin)}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-semibold text-gold-start">
                  {formatPrice(service.price)}
                </span>
              </div>
            ))}
          </div>
          <Link href="/book" className="mt-6 block md:hidden">
            <Button variant="secondary" className="w-full">
              קביעת תור
            </Button>
          </Link>
        </section>

        <div className="md:grid md:grid-cols-2 md:gap-10">
        {/* Hours */}
        <section>
          <div className="section-heading">
            <Clock className="section-heading__icon" />
            <h3 className="section-heading__title">שעות פעילות</h3>
          </div>
          <div className="card-app space-y-2 p-4">
            {workingHours.map((wh) => (
              <div
                key={wh.dayOfWeek}
                className="flex justify-between border-b border-border-subtle py-2 last:border-0"
              >
                <span className="text-text-secondary">
                  {DAY_NAMES[wh.dayOfWeek]}
                </span>
                <span className={wh.isOpen ? "text-text-primary" : "text-text-muted"}>
                  {wh.isOpen ? `${wh.startTime} – ${wh.endTime}` : "סגור"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="pb-8 md:pb-0">
          <div className="section-heading">
            <MapPin className="section-heading__icon" />
            <h3 className="section-heading__title">יצירת קשר</h3>
          </div>
          <div className="card-app space-y-4 p-4">
            {phone && (
              <a
                href={`tel:${phone.replace(/-/g, "")}`}
                className="flex items-center gap-3 text-text-secondary transition-colors hover:text-gold-start"
              >
                <Phone className="h-5 w-5 text-gold-start" />
                {phone}
              </a>
            )}
            {address && (
              <p className="flex items-start gap-3 text-text-secondary">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold-start" />
                {address}
              </p>
            )}
          </div>
        </section>
        </div>
      </div>
      </div>
    </>
  );
}
