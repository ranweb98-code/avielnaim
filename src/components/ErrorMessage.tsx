import { AlertCircle } from "lucide-react";

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-red-200"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <p className="text-sm">{message}</p>
    </div>
  );
}
