"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminAppointmentSheet,
  type AdminSheetAppointment,
} from "@/components/admin/AdminAppointmentSheet";
import {
  AdminDayCalendar,
  type AdminCalendarAppointment,
} from "@/components/AdminDayCalendar";
import { AdminCreateAppointmentModal } from "@/components/AdminCreateAppointmentModal";
import { DatePickerBar } from "@/components/DatePickerBar";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { WeekDayStrip } from "@/components/WeekDayStrip";
import {
  deriveHoursFromAppointments,
  findNextOpenDay,
  isWorkingDay,
} from "@/lib/day-availability";
import { fetchWithCache, getCachedData } from "@/lib/fetch-cache";
import {
  formatJerusalemDate,
  getJerusalemDayOfWeek,
} from "@/lib/timezone";

type Appointment = AdminCalendarAppointment &
  AdminSheetAppointment & {
    inspoIds: string;
  };

type WorkingHour = {
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
};

type Service = {
  id: number;
  name: string;
  durationMin: number;
};

const PUBLIC_CACHE_KEY = "public-api";

export default function AdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatJerusalemDate());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInitialTime, setCreateInitialTime] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const apptRes = await fetch("/api/appointments");

      if (apptRes.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      const apptData = await apptRes.json();
      setAppointments(apptData.appointments ?? []);

      const cachedPublic = getCachedData<{
        workingHours: WorkingHour[];
        blockedDates: string[];
        services: Service[];
      }>(PUBLIC_CACHE_KEY);
      if (cachedPublic?.workingHours) {
        setWorkingHours(cachedPublic.workingHours);
      }
      if (cachedPublic?.blockedDates) {
        setBlockedDates(cachedPublic.blockedDates);
      }
      if (cachedPublic?.services) {
        setServices(cachedPublic.services);
      }

      fetchWithCache<{
        workingHours: WorkingHour[];
        blockedDates: string[];
        services: Service[];
      }>(PUBLIC_CACHE_KEY, "/api/public")
        .then((data) => {
          setWorkingHours(data.workingHours ?? []);
          setBlockedDates(data.blockedDates ?? []);
          setServices(data.services ?? []);
        })
        .catch(() => {
          /* keep cached data if any */
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

  useEffect(() => {
    if (workingHours.length === 0) return;
    if (isWorkingDay(selectedDate, workingHours, blockedDates)) return;
    if (appointments.some((a) => a.date === selectedDate)) return;

    const today = formatJerusalemDate();
    const nextOpen = isWorkingDay(today, workingHours, blockedDates)
      ? today
      : findNextOpenDay(today, workingHours, blockedDates);
    setSelectedDate(nextOpen);
    setSelectedId(null);
  }, [workingHours, blockedDates, selectedDate, appointments]);

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, selectedDate]
  );

  const dayWorkingHours = useMemo(() => {
    const dayOfWeek = getJerusalemDayOfWeek(selectedDate);
    const wh = workingHours.find((w) => w.dayOfWeek === dayOfWeek);
    if (wh?.isOpen) {
      return { startTime: wh.startTime, endTime: wh.endTime };
    }
    return deriveHoursFromAppointments(dayAppointments);
  }, [workingHours, selectedDate, dayAppointments]);

  const appointmentHighlightDates = useMemo(() => {
    const dates = new Set<string>();
    for (const appt of appointments) {
      dates.add(appt.date);
    }
    return [...dates];
  }, [appointments]);

  const selectedAppt =
    appointments.find((a) => a.id === selectedId) ?? null;

  async function patchAppointment(
    id: number,
    body: Record<string, unknown>
  ) {
    setUpdating(true);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "שגיאה בעדכון");
        return false;
      }

      await load();
      return true;
    } catch {
      setError("שגיאה בעדכון");
      return false;
    } finally {
      setUpdating(false);
    }
  }

  async function deleteAppointment(id: number) {
    if (!window.confirm("למחוק את התור לצמיתות?")) return;

    setUpdating(true);
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
      setUpdating(false);
    }
  }

  async function handleCreated(created: {
    date: string;
    status: Appointment["status"];
  }) {
    setSelectedDate(created.date);
    setSelectedId(null);
    setCreateInitialTime("");
    await load();
  }

  function openCreateAtTime(time: string) {
    setCreateInitialTime(time);
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setCreateInitialTime("");
  }

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="admin-shell">
        <div className="admin-date-nav">
          <DatePickerBar
            selectedDate={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedId(null);
            }}
            workingHours={workingHours}
            blockedDates={blockedDates}
            restrictAvailability
            allowPastDates
            compact
          />
          <WeekDayStrip
            selectedDate={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedId(null);
            }}
            workingHours={workingHours}
            blockedDates={blockedDates}
            allowPastDates
            restrictAvailability
            anchorToSelected
            daysToShow={10}
            variant="calmark"
            highlightDates={appointmentHighlightDates}
          />
        </div>

        <div className="admin-shell__main">
          {error && (
            <div className="px-4 pb-2">
              <ErrorMessage message={error} />
            </div>
          )}

          <AdminDayCalendar
            date={selectedDate}
            appointments={dayAppointments}
            workingHours={dayWorkingHours}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onSlotClick={openCreateAtTime}
          />
        </div>
      </div>

      <AdminAppointmentSheet
        appointment={selectedAppt}
        services={services}
        loading={updating}
        onClose={() => setSelectedId(null)}
        onConfirm={(id) => patchAppointment(id, { status: "confirmed" })}
        onCancel={(id, noShow) =>
          patchAppointment(id, {
            status: "cancelled",
            ...(noShow ? { notes: "הברזה" } : {}),
          })
        }
        onDelete={deleteAppointment}
        onSaveNotes={(id, notes) => patchAppointment(id, { notes })}
        onReschedule={(id, data) => patchAppointment(id, data)}
      />

      <AdminCreateAppointmentModal
        open={showCreateModal}
        initialDate={selectedDate}
        initialTime={createInitialTime}
        onClose={closeCreateModal}
        onCreated={handleCreated}
      />
    </>
  );
}
