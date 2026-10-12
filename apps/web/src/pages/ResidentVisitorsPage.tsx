import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { cancelPass, decidePass, listEntries, listPasses } from "../features/visitors/visitor-api";
import { PassStatusBadge, formatDateTime } from "../features/visitors/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function ResidentVisitorsPage() {
  const queryClient = useQueryClient();

  const passes = useQuery({
    queryKey: ["visitors", "passes"],
    queryFn: () => listPasses({ limit: 50 }),
  });
  const entries = useQuery({
    queryKey: ["visitors", "entries"],
    queryFn: () => listEntries({ limit: 10 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["visitors"] });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "APPROVE" | "REJECT" }) =>
      decidePass(id, decision),
    onSuccess: invalidate,
  });
  const cancel = useMutation({ mutationFn: (id: string) => cancelPass(id), onSuccess: invalidate });

  const all = passes.data?.data ?? [];
  const pending = all.filter((pass) => pass.status === "PENDING");
  const others = all.filter((pass) => pass.status !== "PENDING");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitors"
        subtitle="Create passes, approve arrivals and review history."
        actions={
          <Link to="/app/visitors/new">
            <Button size="sm">
              <Icon name="plus" className="h-4 w-4" />
              New pass
            </Button>
          </Link>
        }
      />

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Awaiting your approval</h2>
          {pending.map((pass) => (
            <Card key={pass.id} className="border-[var(--color-warning)]/40">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-medium">{pass.visitor.name}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {pass.visitor.phone ?? "No phone"} · Flat {pass.flat.code}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={decide.isPending}
                    onClick={() => decide.mutate({ id: pass.id, decision: "APPROVE" })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={decide.isPending}
                    onClick={() => decide.mutate({ id: pass.id, decision: "REJECT" })}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Passes</h2>
        {passes.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : others.length === 0 ? (
          <Alert>No visitor passes yet.</Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((pass) => (
              <Card key={pass.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{pass.visitor.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {pass.flat.floor.building.name} · {pass.flat.code}
                      </p>
                    </div>
                    <PassStatusBadge status={pass.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[var(--color-muted)] px-2 py-1 font-mono text-sm tracking-widest">
                      {pass.code}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {pass.type === "SINGLE_USE" ? "Single use" : "Time window"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Valid from {formatDateTime(pass.validFrom)}
                    {pass.validTo ? ` · until ${formatDateTime(pass.validTo)}` : ""}
                  </p>
                  {pass.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={cancel.isPending}
                      onClick={() => cancel.mutate(pass.id)}
                    >
                      Cancel pass
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent gate activity</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.data && entries.data.data.length > 0 ? (
            <ul className="space-y-3">
              {entries.data.data.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{entry.visitor.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDateTime(entry.createdAt)} · {entry.method}
                    </p>
                  </div>
                  <PassStatusBadge status={entry.direction === "IN" ? "ACTIVE" : "USED"} />
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
