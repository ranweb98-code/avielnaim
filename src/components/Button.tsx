import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({
  children,
  className,
  variant = "primary",
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "btn-yellow",
    secondary:
      "bg-bg-card text-text-primary border border-white/10 hover:bg-bg-card-hover rounded-2xl",
    ghost: "text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-2xl",
    danger:
      "bg-red-900/40 text-red-200 border border-red-700/50 hover:bg-red-900/60 rounded-2xl",
  };

  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
