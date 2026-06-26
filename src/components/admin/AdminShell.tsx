"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings, Users, X } from "lucide-react";
import { BUSINESS_NAME } from "@/lib/utils";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLogin = pathname === "/admin/login";

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  if (isLogin) {
    return (
      <div data-admin className="admin-layout">
        {children}
      </div>
    );
  }

  return (
    <div data-admin className="admin-layout">
      <div className="admin-layout__frame">
        <header className="admin-shell__header">
          <button
            type="button"
            className="admin-shell__icon-btn admin-shell__icon-btn--menu"
            onClick={() => setMenuOpen(true)}
            aria-label="תפריט"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/admin" className="admin-shell__brand">
            {BUSINESS_NAME}
          </Link>

          <Link
            href="/admin/settings"
            className="admin-shell__icon-btn"
            aria-label="הגדרות"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>

        {menuOpen && (
          <>
            <button
              type="button"
              className="admin-menu-backdrop"
              aria-label="סגירת תפריט"
              onClick={() => setMenuOpen(false)}
            />
            <nav className="admin-menu" aria-label="תפריט ניהול">
              <div className="admin-menu__header">
                <span className="admin-menu__title">תפריט</span>
                <button
                  type="button"
                  className="admin-shell__icon-btn"
                  onClick={() => setMenuOpen(false)}
                  aria-label="סגור"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Link
                href="/admin"
                className="admin-menu__link"
                onClick={() => setMenuOpen(false)}
              >
                תורים
              </Link>
              <Link
                href="/admin/customers"
                className="admin-menu__link"
                onClick={() => setMenuOpen(false)}
              >
                <Users className="h-4 w-4" />
                לקוחות
              </Link>
              <Link
                href="/admin/settings"
                className="admin-menu__link"
                onClick={() => setMenuOpen(false)}
              >
                <Settings className="h-4 w-4" />
                הגדרות
              </Link>
              <button type="button" className="admin-menu__link" onClick={logout}>
                <LogOut className="h-4 w-4" />
                יציאה
              </button>
            </nav>
          </>
        )}

        {children}
      </div>
    </div>
  );
}
