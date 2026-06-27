"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { BUSINESS_NAME } from "@/lib/utils";

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  const menu = menuOpen ? (
    <>
      <button
        type="button"
        className="admin-menu-backdrop"
        aria-label="סגירת תפריט"
        onClick={() => setMenuOpen(false)}
      />
      <nav className="admin-menu" aria-label="תפריט ניהול">
        <div className="admin-menu__header">
          <button
            type="button"
            className="admin-shell__icon-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="admin-menu__title">תפריט</span>
          <span className="admin-menu__brand">{BUSINESS_NAME}</span>
        </div>

        <div className="admin-menu__links">
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
            <Users className="h-5 w-5" />
            לקוחות
          </Link>
          <Link
            href="/admin/settings"
            className="admin-menu__link"
            onClick={() => setMenuOpen(false)}
          >
            <Settings className="h-5 w-5" />
            הגדרות
          </Link>
          <Link
            href="/?public=1"
            className="admin-menu__link"
            onClick={() => setMenuOpen(false)}
          >
            <Home className="h-5 w-5" />
            דף הבית
          </Link>
          <button type="button" className="admin-menu__link admin-menu__link--logout" onClick={logout}>
            <LogOut className="h-5 w-5" />
            יציאה
          </button>
        </div>
      </nav>
    </>
  ) : null;

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

          <div className="admin-shell__header-actions">
            <Link
              href="/?public=1"
              className="admin-shell__icon-btn"
              aria-label="דף הבית"
            >
              <Home className="h-5 w-5" />
            </Link>
            <Link
              href="/admin/settings"
              className="admin-shell__icon-btn"
              aria-label="הגדרות"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {mounted && menu ? createPortal(menu, document.body) : null}

        {children}
      </div>
    </div>
  );
}
