"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, LogOut, X } from "lucide-react";
import { AdminPanelHeader } from "@/components/AdminPanelHeader";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { GlassCard } from "@/components/GlassCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/cn";
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

const TABS = [
  { key: "pending", label: "ממתינים" },
  { key: "confirmed", label: "מאושרים" },
  { key: "cancelled", label: "בוטלו" },
] as const;

export default function AdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inspoMap, setInspoMap] = useState<Record<number, InspoImage>>({});
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

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

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  const filtered = appointments.filter((a) => a.status === tab);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <AdminPanelHeader />
      <div className="mx-auto max-w-2xl px-4 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-cream/50 hover:text-cream">
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

      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "min-h-11 flex-1 rounded-xl text-sm transition-all duration-200",
              tab === t.key
                ? "bg-accent-copper/30 text-accent-gold"
                : "bg-cream/5 text-cream/60 hover:bg-cream/10"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="אין תורים" description={`אין תורים בסטטוס "${TABS.find((t) => t.key === tab)?.label}"`} />
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
                    <h3 className="font-medium text-cream">{appt.customerName}</h3>
                    <p className="text-sm text-accent-gold">{appt.serviceName}</p>
                  </div>
                  <span className="text-sm text-cream/60">
                    {appt.date} · {appt.time}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-cream/70">
                  <p dir="ltr" className="text-right">{appt.customerPhone}</p>
                  <p dir="ltr" className="text-right">{appt.customerEmail}</p>
                  {appt.notes && <p>הערות: {appt.notes}</p>}
                </div>
                {inspoImages.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-cream/50">תמונות השראה:</p>
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
                      אשר
                    </Button>
                    <Button
                      variant="danger"
                      loading={updating === appt.id}
                      onClick={() => updateStatus(appt.id, "cancelled")}
                    >
                      <X className="h-4 w-4" />
                      בטל
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
              </GlassCard>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
