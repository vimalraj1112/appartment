import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { HandoverPerson } from "../features/reports/reports-api";
import { getHandover } from "../features/reports/reports-api";
import { StatGrid, StatTile, formatDateTime, formatTime } from "../features/reports/components";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

const RANGES = [
  { hours: 12, label: "12 hours" },
  { hours: 24, label: "24 hours" },
  { hours: 48, label: "48 hours" },
];

function personName(person: HandoverPerson | null): string {
  if (!person) return "—";
  return `${person.firstName} ${person.lastName}`;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export function GuardHandoverPage() {
  const [hours, setHours] = useState(12);
  const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const handover = useQuery({
    queryKey: ["handover", hours],
    queryFn: () => getHandover({ from }),
    refetchInterval: 60_000,
  });

  if (handover.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (handover.isError || !handover.data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Shift handover" />
        <Alert variant="destructive">We could not load the handover report right now.</Alert>
      </div>
    );
  }

  const data = handover.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift handover"
        subtitle={`${formatDateTime(data.window.from)} → ${formatDateTime(data.window.to)}`}
      />

      <div className="flex flex-wrap gap-2">
        {RANGES.map((range) => (
          <Button
            key={range.hours}
            size="sm"
            variant={hours === range.hours ? "primary" : "outline"}
            onClick={() => setHours(range.hours)}
          >
            Last {range.label}
          </Button>
        ))}
      </div>

      {data.activeAlerts > 0 && (
        <Alert variant="destructive">{data.activeAlerts} emergency alert(s) are still active — hand over to the next shift.</Alert>
      )}

      <StatGrid>
        <StatTile label="Visitor entries" value={data.totals.visitorEntries} hint={`${data.totals.visitorIn} in · ${data.totals.visitorOut} out`} />
        <StatTile label="Walk-ins" value={data.totals.walkIns} />
        <StatTile label="Deliveries" value={data.totals.deliveries} hint={`${data.totals.deliveryEvents} movements`} />
        <StatTile label="Staff entries" value={data.totals.staffEntries} />
      </StatGrid>

      <StatGrid>
        <StatTile label="Emergency alerts" value={data.totals.emergencyAlerts} tone={data.totals.emergencyAlerts > 0 ? "warning" : "neutral"} />
        <StatTile label="Active alerts" value={data.activeAlerts} tone={data.activeAlerts > 0 ? "negative" : "positive"} />
        <StatTile label="Deliveries by status" value={Object.keys(data.deliveriesByStatus).length} />
        <StatTile label="Window" value={`${data.window.hours}h`} />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Visitor movements</CardTitle>
        </CardHeader>
        <CardContent>
          {data.visitorEntries.length === 0 ? (
            <Alert>No visitor movements in this window.</Alert>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {data.visitorEntries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={entry.direction === "IN" ? "success" : "muted"}>{entry.direction}</Badge>
                    <span className="font-medium">{entry.visitor.name}</span>
                    {entry.visitor.flat && <span className="text-[var(--color-muted-foreground)]">Flat {entry.visitor.flat.code}</span>}
                    <Badge variant="muted">{titleCase(entry.method)}</Badge>
                    {entry.pass && <span className="text-xs text-[var(--color-muted-foreground)]">Pass {entry.pass.code}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                    <span>{formatTime(entry.createdAt)}</span>
                    <span>by {personName(entry.guard)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {data.deliveries.length === 0 ? (
              <Alert>No delivery movements in this window.</Alert>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.deliveries.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <span>
                      <span className="font-medium">{titleCase(event.delivery.category)}</span>
                      {event.delivery.company ? ` · ${event.delivery.company}` : ""}
                      {event.delivery.flat ? ` · Flat ${event.delivery.flat.code}` : ""}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                      <Badge variant="muted">{titleCase(event.status)}</Badge>
                      {formatTime(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff movements</CardTitle>
          </CardHeader>
          <CardContent>
            {data.staffEntries.length === 0 ? (
              <Alert>No staff movements in this window.</Alert>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.staffEntries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Badge variant={entry.direction === "IN" ? "success" : "muted"}>{entry.direction}</Badge>
                      <span className="font-medium">{personName(entry.staff)}</span>
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {formatTime(entry.createdAt)} · by {personName(entry.guard)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emergency alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {data.emergencyAlerts.length === 0 ? (
            <Alert>No emergency alerts in this window.</Alert>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {data.emergencyAlerts.map((alert) => (
                <li key={alert.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <Badge variant="destructive">{titleCase(alert.category)}</Badge>
                    <span className="font-medium">{alert.flat ? `Flat ${alert.flat.code}` : "General"}</span>
                    <span className="text-[var(--color-muted-foreground)]">by {personName(alert.user)}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <Badge variant="muted">{titleCase(alert.status)}</Badge>
                    {formatTime(alert.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
