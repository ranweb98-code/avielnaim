"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/Input";
import { PageHero } from "@/components/PageHero";
import { BUSINESS_NAME } from "@/lib/utils";

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
    <>
      <PageHero
        bottomContent={
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-yellow/20">
              <Lock className="h-7 w-7 text-accent-yellow" />
            </div>
            <h1 className="text-2xl font-bold text-white">כניסת מנהל</h1>
            <p className="mt-2 text-sm text-white/60">
              <span className="brand-name brand-name--card inline-block">
                {BUSINESS_NAME}
              </span>
              {" "}— פאנל ניהול
            </p>
          </div>
        }
      />
      <div className="site-container py-8">
        <div className="mx-auto w-full max-w-md">
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
    </>
  );
}
