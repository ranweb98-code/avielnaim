import Link from "next/link";
import { Settings } from "lucide-react";

export function AdminPanelHeader() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:max-w-5xl md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl">פאנל ניהול</h1>
        <Link
          href="/admin/settings"
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-cream/70 transition-colors hover:text-accent-gold"
        >
          <Settings className="h-5 w-5" />
          הגדרות
        </Link>
      </div>
    </div>
  );
}
