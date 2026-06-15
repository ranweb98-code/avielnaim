"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

const DESKTOP_LINKS = [
  { href: "/", label: "בית" },
  { href: "/book", label: "קביעת תור" },
  { href: "/admin/login", label: "ניהול" },
] as const;

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isBook = pathname === "/book";
  const hideOnMobile = isHome || isBook;

  return (
    <header
      className={cn(
        "app-header sticky top-0 z-40 backdrop-blur-xl",
        hideOnMobile && "hidden md:block"
      )}
    >
      <div className="site-container flex items-center justify-between py-3">
        <Link href="/" className="brand-lockup">
          <span className="brand-lockup-name">Aviel Naim</span>
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="ניווט ראשי"
        >
          {DESKTOP_LINKS.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-gold-start/15 text-gold-end"
                    : "text-text-secondary hover:bg-stone-900/5 hover:text-text-primary"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {!isBook && (
          <Link href="/book" className="btn-gold shrink-0 px-4 py-2 text-sm">
            קביעת תור
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
  subtle?: boolean;
};

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const links: NavLink[] = [
    { href: "/", label: "בית", icon: Home },
    { href: "/book", label: "תור", icon: Calendar },
    { href: "/admin/login", label: "ניהול", icon: Lock, subtle: true },
  ];

  return (
    <nav
      className="bottom-nav-floating fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm pb-safe md:hidden"
      aria-label="ניווט ראשי"
    >
      <div className="flex items-center justify-around px-3 py-2">
        {links.map(({ href, label, icon: Icon, subtle }) => {
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
                active && !subtle && "bg-gold-start/15 text-gold-end",
                active && subtle && "bg-stone-900/5 text-text-muted",
                !active &&
                  !subtle &&
                  "text-text-secondary hover:bg-stone-900/5 hover:text-text-primary",
                subtle &&
                  !active &&
                  "opacity-40 hover:opacity-70 text-text-muted"
              )}
            >
              <Icon
                className={cn(subtle ? "h-4 w-4" : "h-5 w-5")}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
