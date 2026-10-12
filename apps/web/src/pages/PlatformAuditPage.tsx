import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAudit } from "../features/platform/platform-api";
import { formatDateTime } from "../features/platform/components";
import { Alert } from "../components/ui/alert";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function PlatformAuditPage() {
  const [search, setSearch] = useState("");

  const audit = useQuery({
    queryKey: ["platform", "audit", search],
    queryFn: () => listAudit({ q: search || undefined, limit: 100 }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        subtitle="Every sensitive action recorded across the platform."
        actions={
          <Input
            className="w-64"
            placeholder="Filter by action or resource"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      />

      {audit.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (audit.data?.data.length ?? 0) === 0 ? (
        <Alert>No audit entries found.</Alert>
      ) : (
        <Card>
          <CardContent className="divide-y divide-[var(--color-border)] p-0">
            {(audit.data?.data ?? []).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium">{entry.action}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {entry.resource ?? "—"}
                    {entry.user ? ` · ${entry.user.firstName} ${entry.user.lastName}` : ""}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-muted-foreground)]">{formatDateTime(entry.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
