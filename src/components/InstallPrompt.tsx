"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "./Button";
import { GlassCard } from "./GlassCard";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) return;

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;

    if (isIOS) {
      const timer = setTimeout(() => setShowIOS(true), 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed) return null;

  if (deferredPrompt) {
    return (
      <div className="fixed inset-x-4 bottom-20 z-50 md:bottom-4 md:inset-x-auto md:left-4 md:max-w-sm">
        <GlassCard className="flex items-start gap-3 shadow-2xl">
          <Download className="mt-1 h-5 w-5 shrink-0 text-accent-gold" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-medium text-cream">הוסף למסך הבית</p>
              <p className="text-sm text-cream/60">
                קבע תורים מהר יותר — כמו אפליקציה אמיתית
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={async () => {
                  await deferredPrompt.prompt();
                  setDeferredPrompt(null);
                  setDismissed(true);
                }}
              >
                התקן
              </Button>
              <Button variant="ghost" onClick={() => setDismissed(true)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (showIOS) {
    return (
      <div className="fixed inset-x-4 bottom-20 z-50 md:bottom-4">
        <GlassCard className="space-y-3 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-cream">הוסף למסך הבית</p>
              <p className="mt-1 text-sm text-cream/60">
                לחץ על <Share className="inline h-4 w-4" /> Share ואז &quot;Add to Home
                Screen&quot;
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-cream/50 hover:text-cream"
              aria-label="סגור"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return null;
}
