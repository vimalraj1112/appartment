import { useQuery } from "@tanstack/react-query";
import { listEntries, listPasses } from "../features/visitors/visitor-api";
import { PassStatusBadge, formatDateTime } from "../features/visitors/components";
import { Alert } from "../components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function GuardVisitorsPage() {
  const active = useQuery({
    queryKey: ["visitors", "passes", "active"],
    queryFn: () => listPasses({ status: "ACTIVE", limit: 50 }),
  });
  const entries = useQuery({
    queryKey: ["visitors", "entries"],
    queryFn: () => listEntries({ limit: 20 }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Expected visitors" subtitle="Approved passes and recent gate activity." />

      <Card>
        <CardHeader>
          <CardTitle>Approved passes</CardTitle>
        </CardHeader>
        <CardContent>
          {active.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6" />
            </div>
          ) : active.data && active.data.data.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {active.data.data.map((pass) => (
                <li key={pass.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pass.visitor.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {pass.flat.floor.building.name} · {pass.flat.code} · code {pass.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <PassStatusBadge status={pass.status} />
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      {pass.validTo ? `until ${formatDateTime(pass.validTo)}` : "single use"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Alert>No approved passes right now.</Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent gate activity</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.data && entries.data.data.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {entries.data.data.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{entry.visitor.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDateTime(entry.createdAt)} · {entry.method}
                      {entry.guard ? ` · ${entry.guard.firstName}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-medium">{entry.direction}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No gate activity yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
