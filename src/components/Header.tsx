"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home } from "lucide-react";
import { cn } from "@/lib/cn";
import { BUSINESS_NAME } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const isBook = pathname === "/book";
  const isAdmin = pathname.startsWith("/admin");
  const isOffline = pathname === "/offline";
  const hideOnMobile = pathname === "/" || isBook || isAdmin || isOffline;

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
        </nav>

        {!isBook && (
          <Link href="/book" className="btn-yellow shrink-0 px-4 py-2 text-sm">
            קבע תור
          </Link>
        )}
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

  useEffect(() => {
    const SCROLL_THRESHOLD = 120;

    function onScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/admin") || pathname === "/offline") {
    return null;
  }

  const links: NavLink[] = [
    { href: "/", label: "בית", icon: Home },
    { href: "/book", label: "תור", icon: Calendar },
  ];

  return (
    <nav
      className={cn(
        "bottom-nav-floating fixed left-1/2 z-40 transition-all duration-300 ease-out md:hidden",
        visible
          ? "-translate-x-1/2 translate-y-0 opacity-100"
          : "pointer-events-none -translate-x-1/2 translate-y-8 opacity-0"
      )}
      aria-label="ניווט ראשי"
      aria-hidden={!visible}
    >
      <div className="flex items-center justify-center gap-1 px-2 py-1.5">
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
      </div>
    </nav>
  );
}
