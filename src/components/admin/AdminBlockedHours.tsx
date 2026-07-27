"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

export type BlockedTimeSlot = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
};

type AdminBlockedHoursProps = {
  date: string;
  onChanged?: () => void;
};

export function AdminBlockedHours({ date, onChanged }: AdminBlockedHoursProps) {
  const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("14:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/blocked-slots?date=${encodeURIComponent(date)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setBlockedSlots(data.blockedSlots ?? []);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function addBlock() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          startTime,
          endTime,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בחסימה");
        return;
      }
      setShowForm(false);
      setReason("");
      await load();
      onChanged?.();
    } catch {
      setError("שגיאה בחסימה");
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id: number) {
    try {
      const res = await fetch(`/api/admin/blocked-slots?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      await load();
      onChanged?.();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="admin-blocked-hours">
      <button
        type="button"
        className="admin-blocked-hours__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <Clock className="h-4 w-4" />
        <span>שעות חסומות</span>
        {blockedSlots.length > 0 && (
          <span className="admin-blocked-hours__badge">{blockedSlots.length}</span>
        )}
      </button>

      {expanded && (
        <div className="admin-blocked-hours__panel">
          {loading ? (
            <p className="text-sm text-text-secondary">טוען...</p>
          ) : (
            <>
              {blockedSlots.length === 0 && !showForm && (
                <p className="text-sm text-text-secondary">
                  אין שעות חסומות ביום זה
                </p>
              )}

              {blockedSlots.map((slot) => (
                <div key={slot.id} className="admin-blocked-hours__item">
                  <div>
                    <span dir="ltr" className="font-medium text-text-primary">
                      {slot.startTime} – {slot.endTime}
                    </span>
                    {slot.reason && (
                      <p className="text-xs text-text-muted">{slot.reason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="admin-blocked-hours__remove"
                    aria-label="הסר חסימה"
                    onClick={() => removeBlock(slot.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {showForm ? (
                <div className="admin-blocked-hours__form">
                  <div className="admin-blocked-hours__time-row">
                    <label className="admin-blocked-hours__field">
                      <span>מ-</span>
                      <input
                        type="time"
                        className="admin-sheet-field__input admin-sheet-field__input--time"
                        dir="ltr"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </label>
                    <label className="admin-blocked-hours__field">
                      <span>עד</span>
                      <input
                        type="time"
                        className="admin-sheet-field__input admin-sheet-field__input--time"
                        dir="ltr"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    className="admin-sheet-field__input"
                    placeholder="סיבה (אופציונלי) — למשל: הפסקה"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  {error && (
                    <p className="text-sm text-red-400">{error}</p>
                  )}
                  <div className="admin-blocked-hours__form-actions">
                    <Button loading={saving} onClick={addBlock}>
                      חסום
                    </Button>
                    <button
                      type="button"
                      className="admin-blocked-hours__cancel"
                      onClick={() => {
                        setShowForm(false);
                        setError("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "admin-blocked-hours__add",
                    blockedSlots.length > 0 && "mt-2"
                  )}
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="h-4 w-4" />
                  חסום שעות
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export type CalendarBlockedSlot = {
  id: number;
  startTime: string;
  endTime: string;
  reason: string | null;
};
