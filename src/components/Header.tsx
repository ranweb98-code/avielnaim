"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, Lock, Scissors } from "lucide-react";
import { cn } from "@/lib/cn";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isBook = pathname === "/book";

  if (isHome || isBook) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-bg-app/95 backdrop-blur-xl pt-safe">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-text-primary"
        >
          <Scissors className="h-5 w-5 text-gold-start" />
          Barber Noir
        </Link>
        <Link href="/book" className="btn-gold px-4 py-2 text-sm">
          קביעת תור
        </Link>
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
                active && !subtle && "bg-white/15 text-text-primary",
                active && subtle && "bg-white/10 text-text-muted",
                !active &&
                  !subtle &&
                  "text-text-secondary hover:bg-white/5 hover:text-text-primary",
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
