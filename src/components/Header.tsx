"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { BUSINESS_NAME } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isBook = pathname === "/book";
  const isAdmin = pathname.startsWith("/admin");
  const isOffline = pathname === "/offline";
  const hideOnMobile = isHome || isBook || isAdmin || isOffline;

  const [bookingMode, setBookingMode] = useState("self");
  const [businessPhone, setBusinessPhone] = useState("");

  useEffect(() => {
    fetch("/api/public")
      .then((r) => r.json())
      .then((data) => {
        setBookingMode(data.settings?.bookingMode ?? "self");
        setBusinessPhone(data.settings?.businessPhone ?? "");
      })
      .catch(() => {});
  }, []);

  const selfBooking = bookingMode !== "admin";
  const phoneHref = businessPhone
    ? `tel:${businessPhone.replace(/-/g, "")}`
    : "/";

  return (
    <header
      className={cn(
        "app-header sticky top-0 z-40 backdrop-blur-xl",
        hideOnMobile && "hidden md:block"
      )}
    >
      <div className="site-container flex items-center justify-between py-3">
        <Link href="/" className="brand-lockup">
          <span className="brand-lockup-name">{BUSINESS_NAME}</span>
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="ניווט ראשי"
        >
          <Link
            href="/"
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-accent-yellow/15 text-accent-yellow"
                : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            )}
          >
            בית
          </Link>
          {selfBooking && (
            <Link
              href="/book"
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                isBook
                  ? "bg-accent-yellow/15 text-accent-yellow"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              )}
            >
              קביעת תור
            </Link>
          )}
        </nav>

        {!isBook &&
          (selfBooking ? (
            <Link href="/book" className="btn-yellow shrink-0 px-4 py-2 text-sm">
              קבע תור
            </Link>
          ) : (
            businessPhone && (
              <a
                href={phoneHref}
                className="btn-yellow shrink-0 inline-flex items-center gap-1 px-4 py-2 text-sm"
              >
                <Phone className="h-4 w-4" />
                התקשר
              </a>
            )
          ))}
        {isBook && <div className="hidden w-[89px] md:block" aria-hidden />}
      </div>
    </header>
  );
}

type NavLink = {
  href: string;
  label: string;
  icon: typeof Home;
};

export function BottomNav() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [bookingMode, setBookingMode] = useState("self");
  const [businessPhone, setBusinessPhone] = useState("");

  useEffect(() => {
    const SCROLL_THRESHOLD = 120;

    function onScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/public")
      .then((r) => r.json())
      .then((data) => {
        setBookingMode(data.settings?.bookingMode ?? "self");
        setBusinessPhone(data.settings?.businessPhone ?? "");
      })
      .catch(() => {});
  }, []);

  if (pathname.startsWith("/admin") || pathname === "/offline") {
    return null;
  }

  const selfBooking = bookingMode !== "admin";
  const phoneHref = businessPhone
    ? `tel:${businessPhone.replace(/-/g, "")}`
    : "/";

  const links: NavLink[] = selfBooking
    ? [
        { href: "/", label: "בית", icon: Home },
        { href: "/book", label: "תור", icon: Calendar },
      ]
    : [{ href: "/", label: "בית", icon: Home }];

  return (
    <nav
      className={cn(
        "bottom-nav-floating fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm pb-safe transition-all duration-300 ease-out md:hidden",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-8 opacity-0"
      )}
      aria-label="ניווט ראשי"
      aria-hidden={!visible}
    >
      <div className="flex items-center justify-around px-3 py-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-2xl px-4 py-2 transition-all duration-200",
                active
                  ? "bg-accent-yellow/15 text-accent-yellow"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </Link>
          );
        })}
        {!selfBooking && businessPhone && (
          <a
            href={phoneHref}
            aria-label="התקשר"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl px-4 py-2 text-text-secondary transition-all duration-200 hover:bg-white/5 hover:text-text-primary"
          >
            <Phone className="h-5 w-5" aria-hidden />
          </a>
        )}
      </div>
    </nav>
  );
}
