import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WatchlistType } from "@superlink/shared";
import {
  createWatchlist,
  deactivateWatchlist,
  listEntries,
  listWatchlist,
} from "../features/visitors/visitor-api";
import { formatDateTime } from "../features/visitors/components";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";

export function AdminSecurityPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ type: "PERSON" as WatchlistType, name: "", value: "", reason: "" });

  const watchlist = useQuery({
    queryKey: ["visitors", "watchlist"],
    queryFn: () => listWatchlist({ limit: 50 }),
  });
  const entries = useQuery({
    queryKey: ["visitors", "entries"],
    queryFn: () => listEntries({ limit: 30 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["visitors", "watchlist"] });

  const add = useMutation({
    mutationFn: () =>
      createWatchlist({
        type: form.type,
        name: form.name.trim(),
        value: form.value.trim() || undefined,
        reason: form.reason.trim(),
      }),
    onSuccess: () => {
      setForm({ type: "PERSON", name: "", value: "", reason: "" });
      void invalidate();
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => deactivateWatchlist(id), onSuccess: invalidate });

  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Watchlist and gate activity log." />

      <Card>
        <CardHeader>
          <CardTitle>Watchlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (form.name && form.reason) add.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as WatchlistType })}
              >
                <option value="PERSON">Person</option>
                <option value="VEHICLE">Vehicle</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone / plate</Label>
              <Input
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input
                required
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
              />
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" loading={add.isPending}>
                Add to watchlist
              </Button>
            </div>
          </form>

          {watchlist.data && watchlist.data.data.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {watchlist.data.data.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">
                      {entry.name}
                      {entry.value ? ` · ${entry.value}` : ""}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{entry.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.active ? "destructive" : "muted"}>
                      {entry.active ? entry.type : "INACTIVE"}
                    </Badge>
                    {entry.active && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={remove.isPending}
                        onClick={() => remove.mutate(entry.id)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Alert>Watchlist is empty.</Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gate activity</CardTitle>
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
