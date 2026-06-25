"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type CancelResult = {
  success?: boolean;
  alreadyCancelled?: boolean;
  error?: string;
  appointment?: {
    date: string;
    time: string;
    serviceName: string;
  };
};

export default function CancelPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CancelResult | null>(null);

  useEffect(() => {
    if (!token) {
      setResult({ error: "קישור לא תקין" });
      setLoading(false);
      return;
    }

    fetch(`/api/appointments/cancel?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setResult({ error: data.error ?? "שגיאה בביטול התור" });
          return;
        }
        setResult(data);
      })
      .catch(() => setResult({ error: "שגיאה בביטול התור" }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingSpinner label="מבטל תור..." />;

  if (result?.error) {
    return (
      <div className="site-container max-w-md py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
          <X className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-text-primary">לא ניתן לבטל</h1>
        <p className="mt-2 text-sm text-text-secondary">{result.error}</p>
        <Link href="/" className="mt-6 block">
          <Button variant="secondary" className="w-full">
            חזרה לדף הבית
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="site-container max-w-md py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
        <Check className="h-8 w-8 text-green-400" />
      </div>
      <h1 className="text-xl font-bold text-text-primary">
        {result?.alreadyCancelled ? "התור כבר בוטל" : "התור בוטל בהצלחה"}
      </h1>
      {result?.appointment && (
        <p className="mt-2 text-sm text-text-secondary">
          {result.appointment.serviceName} · {result.appointment.date} ·{" "}
          {result.appointment.time}
        </p>
      )}
      <Link href="/" className="mt-6 block">
        <Button variant="secondary" className="w-full">
          חזרה לדף הבית
        </Button>
      </Link>
    </div>
  );
}
