import { cn } from "@/lib/cn";

const inputClass =
  "min-h-11 w-full rounded-2xl border border-white/10 bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold-start/50 focus:ring-2 focus:ring-gold-start/20";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.replace(/\s/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(inputClass, error && "border-red-500/50", className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export function Textarea({
  label,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  const inputId = id ?? label?.replace(/\s/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "min-h-24 w-full rounded-2xl border border-white/10 bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold-start/50 focus:ring-2 focus:ring-gold-start/20",
          error && "border-red-500/50",
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
