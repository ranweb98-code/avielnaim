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
    <div className="bg-bg-app">
      {/* Welcome Hero — mobile full-screen, desktop split */}
      <section className="relative -mt-[env(safe-area-inset-top,0px)] min-h-[calc(100dvh+env(safe-area-inset-top,0px))] overflow-hidden md:mt-0 md:min-h-0 md:overflow-visible md:py-8">
        <div className="md:site-container md:grid md:grid-cols-2 md:items-center md:gap-12">
          <div className="absolute inset-0 md:relative md:inset-auto md:order-2 md:h-[32rem] md:overflow-hidden md:rounded-3xl md:shadow-lg">
            <Image
              src={HERO_IMAGE}
              alt={businessName}
              fill
              priority
              className="object-cover object-top md:rounded-3xl md:object-center"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
            <div className="hero-overlay-luxe absolute inset-0 md:hero-overlay-luxe--card md:rounded-3xl" />
          </div>

          <div className="relative flex min-h-[calc(100dvh+env(safe-area-inset-top,0px))] flex-col md:order-1 md:min-h-0 md:justify-center md:px-0 md:pb-0 md:pt-0">
            <div className="hero-top-bar site-container md:p-0 md:pt-0">
              <div className="brand-lockup">
                <span className="brand-lockup-name md:text-4xl">Aviel Naim</span>
              </div>
              <p className="mt-4 hidden max-w-sm text-text-secondary md:block">
                בחר שירות, תאריך ושעה — בקלות
              </p>
            </div>

            <div className="hero-bottom-bar site-container md:mt-8 md:p-0 md:pb-0">
              <Link href="/book" className="block md:inline-block">
                <Button className="min-h-14 w-full text-base md:min-w-48 md:w-auto">
                  <Scissors className="h-5 w-5" />
                  התחל
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <div className="site-container space-y-8 py-8">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            שדרג את הסגנון שלך
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            בחר שירות, תאריך ושעה — בקלות
          </p>
        </div>

        {/* Barber card */}
        <div className="card-app flex items-center gap-4 p-4">
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
          <h3 className="mb-4 text-lg font-semibold text-text-primary">
            השירותים שלנו
          </h3>
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
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
          <Link href="/book" className="mt-4 block">
            <Button variant="secondary" className="w-full">
              קביעת תור
            </Button>
          </Link>
        </section>

        <div className="md:grid md:grid-cols-2 md:gap-8">
        {/* Hours */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gold-start" />
            <h3 className="text-lg font-semibold text-text-primary">
              שעות פעילות
            </h3>
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
        <section className="pb-8">
          <h3 className="mb-4 text-lg font-semibold text-text-primary">
            יצירת קשר
          </h3>
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
  );
}
