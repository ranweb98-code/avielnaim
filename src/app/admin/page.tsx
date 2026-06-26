"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, LogOut, Plus, Settings, Trash2, X } from "lucide-react";
import { AdminCreateAppointmentModal } from "@/components/AdminCreateAppointmentModal";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { GlassCard } from "@/components/GlassCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHero } from "@/components/PageHero";
import { cn } from "@/lib/cn";
import { formatJerusalemDate } from "@/lib/timezone";
import { parseInspoIds } from "@/lib/utils";

type Appointment = {
  id: number;
  serviceName: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string | null;
  inspoIds: string;
  status: "pending" | "confirmed" | "cancelled";
};

type InspoImage = { id: number; src: string; label: string };

const STATUS_LABELS: Record<Appointment["status"], string> = {
  pending: "ממתין לאישור",
  confirmed: "מאושר",
  cancelled: "בוטל",
};

const STATUS_CLASSES: Record<Appointment["status"], string> = {
  pending: "bg-amber-500/15 text-amber-600",
  confirmed: "bg-green-500/15 text-green-600",
  cancelled: "bg-red-500/15 text-red-600",
};

const TABS = [
  { key: "all", label: "הכל" },
  { key: "today", label: "היום" },
  { key: "pending", label: "ממתינים" },
  { key: "confirmed", label: "מאושרים" },
  { key: "cancelled", label: "בוטלו" },
] as const;

export default function AdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inspoMap, setInspoMap] = useState<Record<number, InspoImage>>({});
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, inspoRes] = await Promise.all([
        fetch("/api/appointments"),
        fetch("/api/admin/inspo"),
      ]);

      if (apptRes.status === 401 || inspoRes.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const apptData = await apptRes.json();
      const inspoData = await inspoRes.json();

      setAppointments(apptData.appointments ?? []);

      const map: Record<number, InspoImage> = {};
      for (const img of inspoData.images ?? []) {
        map[img.id] = img;
      }
      setInspoMap(map);
    } catch {
      setError("שגיאה בטעינת תורים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: number, status: Appointment["status"]) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "שגיאה בעדכון");
        return;
      }

      await load();
    } catch {
      setError("שגיאה בעדכון");
    } finally {
      setUpdating(null);
    }
  }

  async function deleteAppointment(id: number) {
    if (!window.confirm("למחוק את התור לצמיתות?")) return;

    setUpdating(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "שגיאה במחיקה");
        return;
      }

      await load();
    } catch {
      setError("שגיאה במחיקה");
    } finally {
      setUpdating(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  const todayJerusalem = formatJerusalemDate();

  const filtered = appointments
    .filter((a) => {
      if (tab === "all") {
        return true;
      }
      if (tab === "today") {
        return a.date === todayJerusalem && a.status !== "cancelled";
      }
      return a.status === tab;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <PageHero
        showBack
        backHref="/"
        topContent={
          <Link
            href="/admin/settings"
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-white/80 transition-colors hover:text-accent-yellow"
          >
            <Settings className="h-5 w-5" />
            הגדרות
          </Link>
        }
        bottomContent={
          <h1 className="text-2xl font-bold text-white">ניהול תורים</h1>
        }
      />
      <div className="site-container max-w-5xl pb-6 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
          ← חזרה לאתר
        </Link>
        <Button variant="ghost" onClick={logout} className="text-sm">
          <LogOut className="h-4 w-4" />
          יציאה
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto hide-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "min-h-11 shrink-0 rounded-xl px-3 text-sm transition-all duration-200",
              tab === t.key
                ? "bg-accent-yellow/15 text-accent-yellow font-medium"
                : "bg-bg-card text-text-secondary hover:bg-bg-card-hover"
            )}
          >
            {t.label}
            {t.key === "today" && (
              <span className="mr-1 text-xs opacity-70">({todayJerusalem})</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="אין תורים"
          description={
            tab === "all"
              ? "אין תורים במערכת"
              : tab === "today"
              ? `אין תורים פעילים להיום (${todayJerusalem})`
              : `אין תורים בסטטוס "${TABS.find((t) => t.key === tab)?.label}"`
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((appt) => {
            const inspoIds = parseInspoIds(appt.inspoIds);
            const inspoImages = inspoIds
              .map((id) => inspoMap[id])
              .filter(Boolean);

            return (
              <GlassCard key={appt.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-text-primary">{appt.customerName}</h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_CLASSES[appt.status]
                        )}
                      >
                        {STATUS_LABELS[appt.status]}
                      </span>
                    </div>
                    <p className="text-sm text-accent-yellow">{appt.serviceName}</p>
                  </div>
                  <span className="text-sm text-text-secondary">
                    {appt.date} · {appt.time}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-text-secondary">
                  <p dir="ltr" className="text-right">{appt.customerPhone}</p>
                  {appt.customerEmail && (
                    <p dir="ltr" className="text-right">{appt.customerEmail}</p>
                  )}
                  {appt.notes && <p>הערות: {appt.notes}</p>}
                </div>
                {inspoImages.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-text-muted">תמונות השראה:</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {inspoImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                        >
                          <Image
                            src={img.src}
                            alt={img.label}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {appt.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      loading={updating === appt.id}
                      onClick={() => updateStatus(appt.id, "confirmed")}
                    >
                      <Check className="h-4 w-4" />
                      אישור
                    </Button>
                    <Button
                      variant="danger"
                      loading={updating === appt.id}
                      onClick={() => updateStatus(appt.id, "cancelled")}
                    >
                      <X className="h-4 w-4" />
                      ביטול
                    </Button>
                  </div>
                )}
                {appt.status === "confirmed" && (
                  <Button
                    variant="danger"
                    className="w-full"
                    loading={updating === appt.id}
                    onClick={() => updateStatus(appt.id, "cancelled")}
                  >
                    בטל תור
                  </Button>
                )}
                <Button
                  variant="secondary"
                  className="w-full"
                  loading={updating === appt.id}
                  onClick={() => deleteAppointment(appt.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  מחק תור
                </Button>
              </GlassCard>
            );
          })}
        </div>
      )}
      </div>

      <button
        type="button"
        className="admin-fab"
        onClick={() => setShowCreateModal(true)}
        aria-label="תור חדש"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AdminCreateAppointmentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={load}
      />
    </>
  );
}
