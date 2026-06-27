"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

export function AdminSessionHint() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;

    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data: { authenticated?: boolean }) => {
        if (!cancelled) {
          setIsAdmin(Boolean(data.authenticated));
        }
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!isAdmin || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="admin-session-hint">
      <Link href="/admin" className="admin-session-hint__link">
        <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
        <span>מחובר כמנהל — חזרה ללוח</span>
      </Link>
    </div>
  );
}
