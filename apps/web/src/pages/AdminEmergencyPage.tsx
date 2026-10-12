import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmergencyAlertStatus, EmergencyCategory } from "@superlink/shared";
import { listAlerts, resolveAlert } from "../features/emergency/emergency-api";
import { EmergencyCategoryBadge, EmergencyStatusBadge } from "../features/emergency/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const STATUSES: EmergencyAlertStatus[] = ["TRIGGERED", "ACKNOWLEDGED", "RESOLVED"];
const CATEGORIES: EmergencyCategory[] = ["MEDICAL", "FIRE", "SECURITY", "ELECTRICAL", "WATER", "OTHER"];

export function AdminEmergencyPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<EmergencyAlertStatus | "">("");
  const [category, setCategory] = useState<EmergencyCategory | "">("");

  const alerts = useQuery({
    queryKey: ["emergency", "admin", status, category],
    queryFn: () => listAlerts({ status: status || undefined, category: category || undefined, limit: 100 }),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => resolveAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emergency"] }),
  });

  const items = alerts.data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Emergency alerts" subtitle="Monitor and resolve emergency alerts raised in the community." />

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={status} onChange={(event) => setStatus(event.target.value as EmergencyAlertStatus | "")}>
          <option value="">All statuses</option>
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <Select value={category} onChange={(event) => setCategory(event.target.value as EmergencyCategory | "")}>
          <option value="">All categories</option>
          {CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </div>

      {alerts.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <Alert>No emergency alerts found.</Alert>
      ) : (
        <div className="space-y-3">
          {items.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <EmergencyCategoryBadge category={alert.category} />
                    <span className="text-sm font-medium">
                      {alert.flat ? `Flat ${alert.flat.code}` : "General alert"}
                    </span>
                    <EmergencyStatusBadge status={alert.status} />
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {alert.user.firstName} {alert.user.lastName} · {new Date(alert.createdAt).toLocaleString("en-IN")}
                  </p>
                  {alert.note && <p className="text-sm">{alert.note}</p>}
                  {alert.acknowledgedBy && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Acknowledged by {alert.acknowledgedBy.firstName} {alert.acknowledgedBy.lastName}
                    </p>
                  )}
                  {alert.resolvedBy && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Resolved by {alert.resolvedBy.firstName} {alert.resolvedBy.lastName}
                    </p>
                  )}
                </div>
                {alert.status !== "RESOLVED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={resolve.isPending}
                    onClick={() => resolve.mutate(alert.id)}
                  >
                    Resolve
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
