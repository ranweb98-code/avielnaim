import { Loader2 } from "lucide-react";

export function LoadingSpinner({ label = "טוען..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-accent-gold" aria-hidden />
      <span className="text-sm text-cream/60">{label}</span>
    </div>
  );
}
