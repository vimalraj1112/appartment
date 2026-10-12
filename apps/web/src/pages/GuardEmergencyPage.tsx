import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acknowledgeAlert, listAlerts, resolveAlert } from "../features/emergency/emergency-api";
import { EmergencyCategoryBadge, EmergencyStatusBadge } from "../features/emergency/components";
import { onEmergency } from "../features/realtime/socket";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function GuardEmergencyPage() {
  const queryClient = useQueryClient();

  const alerts = useQuery({ queryKey: ["emergency", "guard"], queryFn: () => listAlerts({ limit: 50 }) });

  useEffect(
    () =>
      onEmergency(() => {
        queryClient.invalidateQueries({ queryKey: ["emergency"] });
      }),
    [queryClient],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["emergency"] });
  const ack = useMutation({ mutationFn: (id: string) => acknowledgeAlert(id), onSuccess: invalidate });
  const resolve = useMutation({ mutationFn: (id: string) => resolveAlert(id), onSuccess: invalidate });

  const items = alerts.data?.data ?? [];
  const active = items.filter((alert) => alert.status !== "RESOLVED");
  const history = items.filter((alert) => alert.status === "RESOLVED");

  return (
    <div className="space-y-6">
      <PageHeader title="Emergency console" subtitle="Live alerts from residents and staff across the community." />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Active alerts {active.length > 0 && <span className="text-[var(--color-destructive)]">({active.length})</span>}
        </h2>
        {alerts.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : active.length === 0 ? (
          <Alert>No active emergency alerts. All clear.</Alert>
        ) : (
          <div className="space-y-3">
            {active.map((alert) => (
              <Card key={alert.id} className="border-[var(--color-destructive)]/50">
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <EmergencyCategoryBadge category={alert.category} />
                      {alert.flat && <span className="font-medium">Flat {alert.flat.code}</span>}
                      <EmergencyStatusBadge status={alert.status} />
                    </div>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {new Date(alert.createdAt).toLocaleTimeString("en-IN")}
                    </span>
                  </div>
                  <p className="text-sm">
                    {alert.user.firstName} {alert.user.lastName}
                    {alert.note ? ` · ${alert.note}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {alert.status === "TRIGGERED" && (
                      <Button size="sm" loading={ack.isPending} onClick={() => ack.mutate(alert.id)}>
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      loading={resolve.isPending}
                      onClick={() => resolve.mutate(alert.id)}
                    >
                      Mark resolved
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Recently resolved</h2>
          <div className="space-y-2">
            {history.slice(0, 10).map((alert) => (
              <Card key={alert.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-2">
                    <EmergencyCategoryBadge category={alert.category} />
                    <span className="text-sm">
                      {alert.flat ? `Flat ${alert.flat.code}` : "General"} ·{" "}
                      {new Date(alert.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <EmergencyStatusBadge status={alert.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
