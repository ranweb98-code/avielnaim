"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { AdminPanelHeader } from "@/components/AdminPanelHeader";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/Input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DAY_NAMES } from "@/lib/utils";

type WorkingHour = {
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
};

type Service = {
  id: number;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  sortOrder: number;
  active: boolean;
};

type InspoImage = {
  id: number;
  src: string;
  label: string;
  tags: string;
  sortOrder: number;
  active: boolean;
};

type BlockedDate = {
  id: number;
  date: string;
  reason: string | null;
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [inspoImages, setInspoImages] = useState<InspoImage[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);

  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");
  const [newInspo, setNewInspo] = useState({ src: "", label: "", tags: "" });
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    durationMin: "30",
    price: "80",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, servicesRes, inspoRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/services"),
        fetch("/api/admin/inspo"),
      ]);

      if (settingsRes.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const settingsData = await settingsRes.json();
      const servicesData = await servicesRes.json();
      const inspoData = await inspoRes.json();

      setSettings(settingsData.settings ?? {});
      setWorkingHours(settingsData.workingHours ?? []);
      setBlockedDates(settingsData.blockedDates ?? []);
      setServices(servicesData.services ?? []);
      setInspoImages(inspoData.images ?? []);
    } catch {
      setError("שגיאה בטעינת הגדרות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings(partial: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!res.ok) {
        setError("שגיאה בשמירה");
        return;
      }
      setSuccess("נשמר בהצלחה");
      await load();
    } catch {
      setError("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  async function addService() {
    if (!newService.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newService.name,
          description: newService.description || undefined,
          durationMin: parseInt(newService.durationMin, 10),
          price: parseInt(newService.price, 10),
        }),
      });
      if (!res.ok) {
        setError("שגיאה בהוספת שירות");
        return;
      }
      setNewService({ name: "", description: "", durationMin: "30", price: "80" });
      await load();
      setSuccess("שירות נוסף");
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(id: number) {
    if (!confirm("למחוק שירות?")) return;
    await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    await load();
  }

  async function addInspo() {
    if (!newInspo.src || !newInspo.label) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inspo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInspo),
      });
      if (!res.ok) {
        setError("שגיאה בהוספת תמונה");
        return;
      }
      setNewInspo({ src: "", label: "", tags: "" });
      await load();
      setSuccess("תמונה נוספה");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInspo(id: number) {
    if (!confirm("למחוק תמונה?")) return;
    await fetch(`/api/admin/inspo/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <AdminPanelHeader />
      <div className="mx-auto max-w-2xl space-y-8 px-4 pb-12">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-cream/50 hover:text-cream"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לתורים
        </Link>

        {error && <ErrorMessage message={error} />}
        {success && (
          <p className="rounded-xl border border-green-500/30 bg-green-950/30 p-3 text-sm text-green-200">
            {success}
          </p>
        )}

        <section>
          <h2 className="mb-4 font-serif text-xl">פרטי עסק</h2>
          <GlassCard className="space-y-3">
            <Input
              label="שם העסק"
              value={settings.businessName ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, businessName: e.target.value })
              }
            />
            <Input
              label="טלפון"
              value={settings.businessPhone ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, businessPhone: e.target.value })
              }
            />
            <Input
              label="כתובת"
              value={settings.businessAddress ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, businessAddress: e.target.value })
              }
            />
            <Input
              label="אימייל בעל העסק"
              value={settings.ownerEmail ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, ownerEmail: e.target.value })
              }
              dir="ltr"
              className="text-left"
            />
            <Button
              loading={saving}
              onClick={() => saveSettings({ settings })}
            >
              שמור פרטי עסק
            </Button>
          </GlassCard>
        </section>

        <section>
          <h2 className="mb-4 font-serif text-xl">שעות עבודה</h2>
          <GlassCard className="space-y-3">
            {workingHours.map((wh, idx) => (
              <div
                key={wh.dayOfWeek}
                className="flex flex-wrap items-center gap-2 border-b border-cream/5 pb-3 last:border-0"
              >
                <span className="w-16 text-sm">{DAY_NAMES[wh.dayOfWeek]}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={wh.isOpen}
                    onChange={(e) => {
                      const updated = [...workingHours];
                      updated[idx] = { ...wh, isOpen: e.target.checked };
                      setWorkingHours(updated);
                    }}
                  />
                  פתוח
                </label>
                <input
                  type="time"
                  value={wh.startTime}
                  onChange={(e) => {
                    const updated = [...workingHours];
                    updated[idx] = { ...wh, startTime: e.target.value };
                    setWorkingHours(updated);
                  }}
                  className="rounded-lg border border-cream/10 bg-bg-secondary px-2 py-1 text-sm"
                />
                <span className="text-cream/40">–</span>
                <input
                  type="time"
                  value={wh.endTime}
                  onChange={(e) => {
                    const updated = [...workingHours];
                    updated[idx] = { ...wh, endTime: e.target.value };
                    setWorkingHours(updated);
                  }}
                  className="rounded-lg border border-cream/10 bg-bg-secondary px-2 py-1 text-sm"
                />
              </div>
            ))}
            <Button
              loading={saving}
              onClick={() => saveSettings({ workingHours })}
            >
              שמור שעות
            </Button>
          </GlassCard>
        </section>

        <section>
          <h2 className="mb-4 font-serif text-xl">שירותים</h2>
          <div className="space-y-3">
            {services.map((s) => (
              <GlassCard key={s.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-cream/50">
                    {s.durationMin} דק&apos; · {s.price} ₪
                  </p>
                </div>
                <Button variant="danger" onClick={() => deleteService(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </GlassCard>
            ))}
            <GlassCard className="space-y-3">
              <Input
                label="שם שירות חדש"
                value={newService.name}
                onChange={(e) =>
                  setNewService({ ...newService, name: e.target.value })
                }
              />
              <Input
                label="תיאור"
                value={newService.description}
                onChange={(e) =>
                  setNewService({ ...newService, description: e.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="משך (דק')"
                  type="number"
                  value={newService.durationMin}
                  onChange={(e) =>
                    setNewService({ ...newService, durationMin: e.target.value })
                  }
                />
                <Input
                  label="מחיר (₪)"
                  type="number"
                  value={newService.price}
                  onChange={(e) =>
                    setNewService({ ...newService, price: e.target.value })
                  }
                />
              </div>
              <Button onClick={addService} loading={saving}>
                <Plus className="h-4 w-4" />
                הוסף שירות
              </Button>
            </GlassCard>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-serif text-xl">ימים חסומים</h2>
          <GlassCard className="space-y-3">
            {blockedDates.map((bd) => (
              <div
                key={bd.id}
                className="flex items-center justify-between border-b border-cream/5 pb-2 last:border-0"
              >
                <span>
                  {bd.date}
                  {bd.reason && (
                    <span className="mr-2 text-sm text-cream/50">({bd.reason})</span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  onClick={() =>
                    saveSettings({ removeBlockedDate: bd.date })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                value={newBlockedDate}
                onChange={(e) => setNewBlockedDate(e.target.value)}
              />
              <Input
                placeholder="סיבה (אופציונלי)"
                value={newBlockedReason}
                onChange={(e) => setNewBlockedReason(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                if (!newBlockedDate) return;
                saveSettings({
                  blockedDates: [
                    { date: newBlockedDate, reason: newBlockedReason || undefined },
                  ],
                });
                setNewBlockedDate("");
                setNewBlockedReason("");
              }}
              loading={saving}
            >
              <Plus className="h-4 w-4" />
              חסום תאריך
            </Button>
          </GlassCard>
        </section>

        <section>
          <h2 className="mb-4 font-serif text-xl">גלריית השראה</h2>
          <div className="space-y-3">
            {inspoImages.map((img) => (
              <GlassCard key={img.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{img.label}</p>
                  <p className="truncate text-xs text-cream/40">{img.src}</p>
                  {img.tags && (
                    <p className="text-xs text-muted">{img.tags}</p>
                  )}
                </div>
                <Button variant="danger" onClick={() => deleteInspo(img.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </GlassCard>
            ))}
            <GlassCard className="space-y-3">
              <Input
                label="URL תמונה"
                value={newInspo.src}
                onChange={(e) =>
                  setNewInspo({ ...newInspo, src: e.target.value })
                }
                dir="ltr"
                className="text-left"
                placeholder="https://..."
              />
              <Input
                label="תווית"
                value={newInspo.label}
                onChange={(e) =>
                  setNewInspo({ ...newInspo, label: e.target.value })
                }
              />
              <Input
                label="תגיות (מופרדות בפסיק)"
                value={newInspo.tags}
                onChange={(e) =>
                  setNewInspo({ ...newInspo, tags: e.target.value })
                }
                placeholder="פייד,קלאסי,מודרני"
              />
              <Button onClick={addInspo} loading={saving}>
                <Plus className="h-4 w-4" />
                הוסף תמונה
              </Button>
            </GlassCard>
          </div>
        </section>
      </div>
    </div>
  );
}
