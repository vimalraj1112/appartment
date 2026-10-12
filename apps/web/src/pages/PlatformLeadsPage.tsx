import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO_LEAD_STATUSES, type DemoLeadStatus } from "@superlink/shared";
import { listLeads, updateLeadStatus } from "../features/leads/leads-api";
import { formatDate } from "../features/platform/components";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const STATUS_VARIANT: Record<DemoLeadStatus, "default" | "success" | "warning" | "muted"> = {
  NEW: "default",
  CONTACTED: "warning",
  CONVERTED: "success",
  DISMISSED: "muted",
};

export function PlatformLeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DemoLeadStatus | "">("");

  const leads = useQuery({
    queryKey: ["platform", "leads", search, status],
    queryFn: () => listLeads({ q: search || undefined, status: status || undefined, limit: 100 }),
  });

  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: DemoLeadStatus }) => updateLeadStatus(id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform", "leads"] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo requests"
        subtitle="Prospects who asked for a walkthrough of SuperLink."
        actions={
          <div className="flex items-center gap-2">
            <Select
              className="w-40"
              value={status}
              onChange={(event) => setStatus(event.target.value as DemoLeadStatus | "")}
            >
              <option value="">All statuses</option>
              {DEMO_LEAD_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <Input
              className="w-56"
              placeholder="Search name / community"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
      />

      {leads.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (leads.data?.data.length ?? 0) === 0 ? (
        <Alert>No demo requests yet.</Alert>
      ) : (
        <div className="space-y-3">
          {(leads.data?.data ?? []).map((lead) => (
            <Card key={lead.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{lead.name}</p>
                    <Badge variant={STATUS_VARIANT[lead.status]}>{lead.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {lead.communityName}
                    {lead.flats ? ` · ${lead.flats} flats` : ""} · {lead.email} · {lead.phone}
                  </p>
                  {lead.message && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">“{lead.message}”</p>
                  )}
                  <p className="text-xs text-[var(--color-muted-foreground)]">received {formatDate(lead.createdAt)}</p>
                </div>
                <Select
                  className="w-40"
                  value={lead.status}
                  disabled={update.isPending}
                  onChange={(event) =>
                    update.mutate({ id: lead.id, next: event.target.value as DemoLeadStatus })
                  }
                >
                  {DEMO_LEAD_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
