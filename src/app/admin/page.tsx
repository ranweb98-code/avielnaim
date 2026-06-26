"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, LogOut, Plus, Settings, Trash2, Users, X } from "lucide-react";
import {
  AdminDayCalendar,
  type AdminCalendarAppointment,
} from "@/components/AdminDayCalendar";
import { AdminCreateAppointmentModal } from "@/components/AdminCreateAppointmentModal";
import { Button } from "@/components/Button";
import { DatePickerBar } from "@/components/DatePickerBar";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { GlassCard } from "@/components/GlassCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { WeekDayStrip } from "@/components/WeekDayStrip";
import { cn } from "@/lib/cn";
import { fetchWithCache, getCachedData } from "@/lib/fetch-cache";
import {
  formatJerusalemDate,
  getJerusalemDayOfWeek,
} from "@/lib/timezone";
import { BUSINESS_NAME, parseInspoIds } from "@/lib/utils";

type Appointment = AdminCalendarAppointment & {
  date: string;
  customerPhone: string;
  customerEmail: string;
  notes: string | null;
  inspoIds: string;
};

type InspoImage = { id: number; src: string; label: string };

type WorkingHour = {
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
};

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
  { key: "pending", label: "ממתינים" },
  { key: "confirmed", label: "מאושרים" },
  { key: "cancelled", label: "בוטלו" },
] as const;

const PUBLIC_CACHE_KEY = "public-api";

export default function AdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [inspoMap, setInspoMap] = useState<Record<number, InspoImage>>({});
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [selectedDate, setSelectedDate] = useState(formatJerusalemDate());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const load = useCallback(async () => {
    setError("");
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

      const cachedPublic = getCachedData<{ workingHours: WorkingHour[] }>(
        PUBLIC_CACHE_KEY
      );
      if (cachedPublic?.workingHours) {
        setWorkingHours(cachedPublic.workingHours);
      }

      fetchWithCache<{ workingHours: WorkingHour[] }>(
        PUBLIC_CACHE_KEY,
        "/api/public"
      )
        .then((data) => setWorkingHours(data.workingHours ?? []))
        .catch(() => {
          /* keep cached hours if any */
        });
    } catch {
      setError("שגיאה בטעינת תורים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dayWorkingHours = useMemo(() => {
    const dayOfWeek = getJerusalemDayOfWeek(selectedDate);
    const wh = workingHours.find((w) => w.dayOfWeek === dayOfWeek);
    if (!wh?.isOpen) return null;
    return { startTime: wh.startTime, endTime: wh.endTime };
  }, [workingHours, selectedDate]);

  const filtered = useMemo(
    () =>
      appointments
        .filter((a) => {
          if (a.date !== selectedDate) return false;
          if (tab === "all") return true;
          return a.status === tab;
        })
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selectedDate, tab]
  );

  const selectedAppt = filtered.find((a) => a.id === selectedId) ?? null;

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

      setSelectedId(null);
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

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="admin-shell">
        <header className="admin-shell__header site-container">
          <div className="admin-shell__header-start">
            <Link href="/" className="admin-shell__brand">
              {BUSINESS_NAME}
            </Link>
          </div>
          <div className="admin-shell__header-actions">
            <Link href="/admin/customers" className="admin-shell__icon-btn" aria-label="לקוחות">
              <Users className="h-5 w-5" />
            </Link>
            <Link href="/admin/settings" className="admin-shell__icon-btn" aria-label="הגדרות">
              <Settings className="h-5 w-5" />
            </Link>
            <button type="button" className="admin-shell__icon-btn" onClick={logout} aria-label="יציאה">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="admin-date-nav site-container">
          <WeekDayStrip
            selectedDate={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedId(null);
            }}
            workingHours={workingHours}
            blockedDates={[]}
            allowPastDates
            restrictAvailability={false}
            anchorToSelected
            daysToShow={10}
            variant="calmark"
          />
          <DatePickerBar
            selectedDate={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedId(null);
            }}
            workingHours={workingHours}
            blockedDates={[]}
            restrictAvailability={false}
            allowPastDates
            compact
          />
        </div>

        <div className="site-container">
          <p className="admin-shell__staff-name">{BUSINESS_NAME}</p>

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          <div className="mb-4 flex gap-2 overflow-x-auto hide-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setSelectedId(null);
                }}
                className={cn(
                  "min-h-9 shrink-0 rounded-full px-3 text-sm transition-all duration-200",
                  tab === t.key
                    ? "bg-accent-yellow/15 text-accent-yellow font-medium"
                    : "bg-bg-card text-text-secondary hover:bg-bg-card-hover"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="אין תורים"
              description={
                tab === "all"
                  ? `אין תורים ב-${selectedDate}`
                  : `אין תורים בסטטוס "${TABS.find((t) => t.key === tab)?.label}"`
              }
            />
          ) : (
            <AdminDayCalendar
              date={selectedDate}
              appointments={filtered}
              workingHours={dayWorkingHours}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}

          {selectedAppt && (
            <GlassCard className="admin-appt-detail mt-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-text-primary">
                      {selectedAppt.customerName}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_CLASSES[selectedAppt.status]
                      )}
                    >
                      {STATUS_LABELS[selectedAppt.status]}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {selectedAppt.time} · {selectedAppt.serviceName}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1 text-text-muted hover:bg-bg-card-hover"
                  onClick={() => setSelectedId(null)}
                  aria-label="סגור"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1 text-sm text-text-secondary">
                <p dir="ltr" className="text-right">
                  {selectedAppt.customerPhone}
                </p>
                {selectedAppt.customerEmail && (
                  <p dir="ltr" className="text-right">
                    {selectedAppt.customerEmail}
                  </p>
                )}
                {selectedAppt.notes && <p>הערות: {selectedAppt.notes}</p>}
              </div>
              {(() => {
                const inspoIds = parseInspoIds(selectedAppt.inspoIds);
                const inspoImages = inspoIds
                  .map((id) => inspoMap[id])
                  .filter(Boolean);
                if (inspoImages.length === 0) return null;
                return (
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
                );
              })()}
              {selectedAppt.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    loading={updating === selectedAppt.id}
                    onClick={() => updateStatus(selectedAppt.id, "confirmed")}
                  >
                    <Check className="h-4 w-4" />
                    אישור
                  </Button>
                  <Button
                    variant="danger"
                    loading={updating === selectedAppt.id}
                    onClick={() => updateStatus(selectedAppt.id, "cancelled")}
                  >
                    <X className="h-4 w-4" />
                    ביטול
                  </Button>
                </div>
              )}
              {selectedAppt.status === "confirmed" && (
                <Button
                  variant="danger"
                  className="w-full"
                  loading={updating === selectedAppt.id}
                  onClick={() => updateStatus(selectedAppt.id, "cancelled")}
                >
                  בטל תור
                </Button>
              )}
              <Button
                variant="secondary"
                className="w-full"
                loading={updating === selectedAppt.id}
                onClick={() => deleteAppointment(selectedAppt.id)}
              >
                <Trash2 className="h-4 w-4" />
                מחק תור
              </Button>
            </GlassCard>
          )}
        </div>
      </div>

      <button
        type="button"
        className="admin-fab admin-fab--calmark"
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
