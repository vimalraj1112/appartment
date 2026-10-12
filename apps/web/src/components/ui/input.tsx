import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-10 w-full rounded-md border border-[var(--color-input)] bg-[var(--color-surface)] " +
            "px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] " +
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] " +
            "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
