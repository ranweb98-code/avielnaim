import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Inbox className="h-10 w-10 text-cream/20" aria-hidden />
      <h3 className="text-lg text-cream/80">{title}</h3>
      {description && <p className="text-sm text-cream/50">{description}</p>}
    </div>
  );
}
