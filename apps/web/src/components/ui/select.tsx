import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-surface)] " +
            "px-3 py-2 text-sm text-[var(--color-foreground)] " +
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] " +
            "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
