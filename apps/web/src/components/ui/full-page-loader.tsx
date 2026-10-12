import { Spinner } from "./spinner";

export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-[var(--color-muted-foreground)]">
      <Spinner className="h-6 w-6 text-[var(--color-primary)]" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
