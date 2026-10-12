import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium " +
  "transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-[var(--color-background)]";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90",
  secondary: "bg-[var(--color-muted)] text-[var(--color-foreground)] hover:opacity-90",
  outline:
    "border border-[var(--color-border)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
  ghost: "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
  destructive:
    "bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-6 text-base",
  icon: "h-10 w-10",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});
