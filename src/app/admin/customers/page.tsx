"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { GlassCard } from "@/components/GlassCard";
import { Input, Textarea } from "@/components/Input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHero } from "@/components/PageHero";
import { cn } from "@/lib/cn";

type CustomerListItem = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string | null;
  appointmentCount: number;
};

type AppointmentHistoryItem = {
  id: number;
  serviceName: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled";
};

type CustomerDetail = CustomerListItem & {
  appointments: AppointmentHistoryItem[];
};

const STATUS_LABELS = {
  pending: "ממתין",
  confirmed: "מאושר",
  cancelled: "בוטל",
} as const;

const CSV_TEMPLATE =
  "firstName,lastName,phone,email,notes\nיוסי,כהן,050-1234567,yossi@example.com,לקוח VIP\n";

type CustomerForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  notes: "",
};

function supportsContactPicker() {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    "ContactsManager" in window
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, CustomerDetail>>({});
  const [detailLoading, setDetailLoading] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCustomers = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/customers${search ? `?q=${encodeURIComponent(search)}` : ""}`
      );
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      setCustomers(data.customers ?? []);
    } catch {
      setError("שגיאה בטעינת לקוחות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, loadCustomers]);

  async function loadDetail(id: number) {
    if (detailCache[id]) return;
    setDetailLoading(id);
    try {
      const res = await fetch(`/api/admin/customers/${id}`);
      const data = await res.json();
      if (res.ok) {
        setDetailCache((prev) => ({ ...prev, [id]: data.customer }));
      }
    } finally {
      setDetailLoading(null);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(customer: CustomerListItem) {
    setEditingId(customer.id);
    setForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes ?? "",
    });
    setModalOpen(true);
  }

  async function saveCustomer() {
    setSaving(true);
    setError("");
    try {
      const url = editingId
        ? `/api/admin/customers/${editingId}`
        : "/api/admin/customers";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בשמירה");
        return;
      }
      setModalOpen(false);
      setSuccess(editingId ? "הלקוח עודכן" : "הלקוח נוסף");
      setDetailCache((prev) => {
        const next = { ...prev };
        if (editingId) delete next[editingId];
        return next;
      });
      await loadCustomers(query);
    } catch {
      setError("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: number) {
    if (!window.confirm("למחוק את הלקוח?")) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה במחיקה");
        return;
      }
      setSuccess("הלקוח נמחק");
      if (expandedId === id) setExpandedId(null);
      await loadCustomers(query);
    } catch {
      setError("שגיאה במחיקה");
    }
  }

  async function importCsv(file: File) {
    setImporting(true);
    setError("");
    try {
      const csv = await file.text();
      const res = await fetch("/api/admin/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בייבוא");
        return;
      }
      setSuccess(
        `ייבוא הושלם: ${data.imported} חדשים, ${data.updated} עודכנו, ${data.skipped} דולגו`
      );
      await loadCustomers(query);
    } catch {
      setError("שגיאה בייבוא");
    } finally {
      setImporting(false);
    }
  }

  async function importFromContacts() {
    if (!supportsContactPicker()) return;

    setImporting(true);
    setError("");
    try {
      const contacts = await (
        navigator as Navigator & {
          contacts: {
            select: (
              props: string[],
              opts: { multiple: boolean }
            ) => Promise<
              Array<{
                name?: string[];
                tel?: string[];
                email?: string[];
              }>
            >;
          };
        }
      ).contacts.select(["name", "tel", "email"], { multiple: true });

      const res = await fetch("/api/admin/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בייבוא");
        return;
      }
      setSuccess(
        `ייבוא הושלם: ${data.imported} חדשים, ${data.updated} עודכנו`
      );
      await loadCustomers(query);
    } catch {
      setError("ייבוא אנשי קשר בוטל או נכשל");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const contactPickerAvailable = useMemo(() => supportsContactPicker(), []);

  if (loading && customers.length === 0 && !query) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <PageHero
        showBack
        backHref="/admin"
        bottomContent={
          <h1 className="text-2xl font-bold text-white">לקוחות</h1>
        }
      />

      <div className="site-container max-w-5xl pb-8 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/admin"
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            ← חזרה לתורים
          </Link>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-600">
            {success}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש לפי שם או טלפון..."
              className="min-h-11 w-full rounded-2xl border border-border-subtle bg-bg-card py-2.5 pe-4 ps-10 text-text-primary outline-none focus:border-accent-yellow/50 focus:ring-2 focus:ring-accent-yellow/20"
            />
          </div>
          <Button onClick={openCreateModal} className="shrink-0">
            <Plus className="h-4 w-4" />
            לקוח חדש
          </Button>
        </div>

        <GlassCard className="mb-6 space-y-3 p-4">
          <h2 className="text-sm font-medium text-text-primary">ייבוא לקוחות</h2>
          <p className="text-sm text-text-secondary">
            ייבוא מקובץ CSV (מומלץ) או מאנשי קשר במכשיר — זמין רק ב-Chrome/Android.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              ייבוא CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importCsv(file);
                e.target.value = "";
              }}
            />
            <Button variant="secondary" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              הורד תבנית
            </Button>
            {contactPickerAvailable && (
              <Button
                variant="secondary"
                loading={importing}
                onClick={importFromContacts}
              >
                <Users className="h-4 w-4" />
                ייבוא מאנשי קשר
              </Button>
            )}
          </div>
        </GlassCard>

        {customers.length === 0 ? (
          <EmptyState
            title="אין לקוחות"
            description={query ? "לא נמצאו תוצאות לחיפוש" : "הוסף לקוח חדש או ייבא מקובץ"}
          />
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => {
              const expanded = expandedId === customer.id;
              const detail = detailCache[customer.id];

              return (
                <GlassCard key={customer.id} className="overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-text-primary">
                        {customer.fullName || customer.firstName}
                      </h3>
                      <p dir="ltr" className="text-sm text-text-secondary text-right">
                        {customer.phone}
                      </p>
                      {customer.email && (
                        <p dir="ltr" className="text-sm text-text-muted text-right">
                          {customer.email}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-text-muted">
                        {customer.appointmentCount} תורים
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="rounded-xl p-2 text-text-secondary hover:bg-bg-card-hover"
                        onClick={() => openEditModal(customer)}
                        aria-label="עריכה"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-xl p-2 text-text-secondary hover:bg-bg-card-hover"
                        onClick={() => deleteCustomer(customer.id)}
                        aria-label="מחיקה"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-sm text-accent-yellow hover:bg-accent-yellow/10"
                    onClick={async () => {
                      if (expanded) {
                        setExpandedId(null);
                        return;
                      }
                      setExpandedId(customer.id);
                      await loadDetail(customer.id);
                    }}
                  >
                    היסטוריית תורים
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {expanded && (
                    <div className="mt-3 border-t border-border-subtle pt-3">
                      {detailLoading === customer.id && (
                        <p className="text-sm text-text-secondary">טוען...</p>
                      )}
                      {detail && detail.appointments.length === 0 && (
                        <p className="text-sm text-text-secondary">אין תורים</p>
                      )}
                      {detail?.appointments.map((appt) => (
                        <div
                          key={appt.id}
                          className="flex items-center justify-between gap-2 py-2 text-sm"
                        >
                          <div>
                            <p className="text-text-primary">{appt.serviceName}</p>
                            <p className="text-text-muted">
                              {appt.date} · {appt.time}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs",
                              appt.status === "confirmed" && "bg-green-500/15 text-green-600",
                              appt.status === "pending" && "bg-amber-500/15 text-amber-600",
                              appt.status === "cancelled" && "bg-red-500/15 text-red-600"
                            )}
                          >
                            {STATUS_LABELS[appt.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal__header">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingId ? "עריכת לקוח" : "לקוח חדש"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="admin-modal__close"
                aria-label="סגור"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="admin-modal__body space-y-3">
              <Input
                label="שם פרטי"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <Input
                label="שם משפחה"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              <Input
                label="טלפון"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                dir="ltr"
                className="text-left"
              />
              <Input
                label="אימייל (אופציונלי)"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                dir="ltr"
                className="text-left"
              />
              <Textarea
                label="הערות (אופציונלי)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
              <Button className="w-full" loading={saving} onClick={saveCustomer}>
                {editingId ? "שמור שינויים" : "הוסף לקוח"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
