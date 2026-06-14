"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, Scissors, Settings } from "lucide-react";
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
        <Link
          href="/book"
          className="btn-gold px-4 py-2 text-sm"
        >
          קביעת תור
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "בית", icon: Home },
    { href: "/book", label: "תור", icon: Calendar },
    { href: "/admin", label: "ניהול", icon: Settings },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-bg-app/95 backdrop-blur-xl pb-safe md:hidden">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-3 text-xs transition-colors duration-200",
                active ? "text-gold-start" : "text-text-muted hover:text-text-secondary"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
