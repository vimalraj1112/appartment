import { type HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const variants: Record<Variant, string> = {
  default: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  success: "bg-[var(--color-success)]/12 text-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]/12 text-[var(--color-warning)]",
  destructive: "bg-[var(--color-destructive)]/12 text-[var(--color-destructive)]",
  muted: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
