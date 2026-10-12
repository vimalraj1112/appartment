import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Card, CardContent } from "../../components/ui/card";

export function formatMoney(inr: number): string {
  return `₹${Math.round(inr).toLocaleString("en-IN")}`;
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

type Tone = "neutral" | "positive" | "negative" | "warning";

const TONE_CLASS: Record<Tone, string> = {
  positive: "text-[var(--color-success)]",
  negative: "text-[var(--color-destructive)]",
  neutral: "text-[var(--color-foreground)]",
  warning: "text-[var(--color-warning)]",
};

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {label}
        </p>
        <p className={cn("text-2xl font-semibold tabular-nums", TONE_CLASS[tone])}>{value}</p>
        {hint && <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function GroupedBarChart({
  data,
  series,
  format = (value: number) => String(value),
}: {
  data: Array<{ label: string; values: Record<string, number> }>;
  series: Array<{ key: string; label: string; color: string }>;
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.flatMap((row) => series.map((s) => row.values[s.key] ?? 0)));
  return (
    <div>
      <div className="flex h-52 items-end gap-3 sm:gap-5">
        {data.map((row) => (
          <div key={row.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-44 items-end gap-1">
              {series.map((s) => {
                const value = row.values[s.key] ?? 0;
                const height = Math.max(2, Math.round((value / max) * 100));
                return (
                  <div
                    key={s.key}
                    title={`${s.label}: ${format(value)}`}
                    style={{ height: `${height}%`, background: s.color }}
                    className="w-3 rounded-t-sm transition-all sm:w-5"
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-[var(--color-muted-foreground)]">{row.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  format = (value: number) => String(value),
  centerLabel,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  format?: (value: number) => string;
  centerLabel?: string;
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const size = 150;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-[var(--color-muted)]"
          />
          {total > 0 &&
            data.map((slice) => {
              const length = (slice.value / total) * circumference;
              const circle = (
                <circle
                  key={slice.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={stroke}
                  stroke={slice.color}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold">{total}</span>
          {centerLabel && (
            <span className="text-[10px] text-[var(--color-muted-foreground)]">{centerLabel}</span>
          )}
        </div>
      </div>
      <ul className="space-y-1.5">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
            <span className="min-w-24">{slice.label}</span>
            <span className="font-medium tabular-nums">{format(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const size = 168;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const dash = (clamped / 100) * circumference;
  const color =
    score >= 80
      ? "var(--color-success)"
      : score >= 60
        ? "var(--color-warning)"
        : "var(--color-destructive)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-[var(--color-muted)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold">{score}</span>
        <span className="text-xs text-[var(--color-muted-foreground)]">Grade {grade}</span>
      </div>
    </div>
  );
}

export function MetricBar({ label, score, detail }: { label: string; score: number; detail: string }) {
  const tone =
    score >= 80
      ? "bg-[var(--color-success)]"
      : score >= 60
        ? "bg-[var(--color-warning)]"
        : "bg-[var(--color-destructive)]";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{score}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)]">{detail}</p>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
