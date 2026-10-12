import { type HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "info" | "success" | "warning" | "destructive";

const variants: Record<Variant, string> = {
  info: "border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-foreground)]",
  success: "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  warning: "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
  destructive:
    "border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]",
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Alert({ className, variant = "info", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("rounded-md border px-4 py-3 text-sm", variants[variant], className)}
      {...props}
    />
  );
}
