"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/Input";

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה בהתחברות");
        return;
      }

      window.location.assign(redirect);
    } catch {
      setError("שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site-container py-12">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-copper/20">
          <Lock className="h-7 w-7 text-accent-gold" />
        </div>
        <h1 className="font-serif text-3xl">כניסת מנהל</h1>
        <p className="mt-2 text-sm text-cream/60">Barber Noir — פאנל ניהול</p>
      </div>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <ErrorMessage message={error} />}
          <Input
            label="סיסמה"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" loading={loading}>
            התחבר
          </Button>
        </form>
      </GlassCard>
      </div>
    </div>
  );
}
