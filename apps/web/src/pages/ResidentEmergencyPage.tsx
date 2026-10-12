import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmergencyCategory } from "@superlink/shared";
import { listAlerts, triggerAlert } from "../features/emergency/emergency-api";
import { EmergencyCategoryBadge, EmergencyStatusBadge } from "../features/emergency/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";
import { cn } from "../lib/cn";

const CATEGORIES: EmergencyCategory[] = ["MEDICAL", "FIRE", "SECURITY", "ELECTRICAL", "WATER", "OTHER"];
const HOLD_MS = 1800;

export function ResidentEmergencyPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<EmergencyCategory>("MEDICAL");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);

  const frameRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const alerts = useQuery({ queryKey: ["emergency", "mine"], queryFn: () => listAlerts() });

  const trigger = useMutation({
    mutationFn: () => triggerAlert({ category, note: note.trim() || undefined }),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["emergency"] });
    },
  });

  const items = alerts.data?.data ?? [];
  const active = items.find((alert) => alert.status !== "RESOLVED");

  const finishHold = () => {
    setProgress(0);
    if (!active) trigger.mutate();
  };

  const startHold = () => {
    if (active) return;
    cancelHold();
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const next = Math.min(1, elapsed / HOLD_MS);
      setProgress(next);
      if (next >= 1) {
        frameRef.current = null;
        finishHold();
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setProgress(0);
  };

  useEffect(() => () => cancelHold(), []);

  return (
    <div className="space-y-5">
      <PageHeader title="Emergency" subtitle="Hold the button to alert your community's security team." />

      {active && (
        <Alert variant="destructive">
          {active.status === "ACKNOWLEDGED"
            ? "A responder has acknowledged your alert and is on the way."
            : "Your alert has been sent. Security has been notified."}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Raise an alert</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trigger.isError && <Alert variant="destructive">{trigger.error.message}</Alert>}

          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                    category === option
                      ? "border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]"
                      : "border-[var(--color-border)] hover:bg-[var(--color-muted)]/50",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              value={note}
              placeholder="e.g. Ground floor, near lift"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <button
            type="button"
            disabled={Boolean(active) || trigger.isPending}
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            className={cn(
              "relative flex h-32 w-full select-none items-center justify-center overflow-hidden rounded-2xl border-2 text-lg font-semibold transition-colors",
              active
                ? "cursor-not-allowed border-[var(--color-border)] text-[var(--color-muted-foreground)]"
                : "border-[var(--color-destructive)] text-[var(--color-destructive)] active:bg-[var(--color-destructive)]/5",
            )}
          >
            <span
              className="absolute inset-y-0 left-0 bg-[var(--color-destructive)]/20"
              style={{ width: `${progress * 100}%` }}
            />
            <span className="relative">
              {active ? "Alert active" : trigger.isPending ? "Sending…" : "Hold to trigger"}
            </span>
          </button>
          <p className="text-center text-xs text-[var(--color-muted-foreground)]">
            Keep holding for {HOLD_MS / 1000} seconds. This notifies security and community admins instantly.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">My alerts</h2>
        {alerts.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6" />
          </div>
        ) : items.length === 0 ? (
          <Alert>You have no emergency alerts.</Alert>
        ) : (
          <div className="space-y-3">
            {items.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="flex items-center justify-between gap-3 p-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <EmergencyCategoryBadge category={alert.category} />
                      {alert.flat && (
                        <span className="text-xs text-[var(--color-muted-foreground)]">Flat {alert.flat.code}</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {new Date(alert.createdAt).toLocaleString("en-IN")}
                    </p>
                    {alert.note && <p className="text-sm">{alert.note}</p>}
                  </div>
                  <EmergencyStatusBadge status={alert.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {active && (
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["emergency"] })}>
          Refresh status
        </Button>
      )}
    </div>
  );
}
