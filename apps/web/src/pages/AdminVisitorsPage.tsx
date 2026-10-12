import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeliveryStatus, VisitorPassStatus } from "@superlink/shared";
import {
  createDelivery,
  decidePass,
  listDeliveries,
  listGateFlats,
  listPasses,
  updateDeliveryStatus,
} from "../features/visitors/visitor-api";
import { DeliveryStatusBadge, PassStatusBadge, formatDateTime } from "../features/visitors/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";

const PASS_STATUSES: VisitorPassStatus[] = ["PENDING", "ACTIVE", "USED", "EXPIRED", "CANCELLED"];
const DELIVERY_NEXT: DeliveryStatus[] = ["EXPECTED", "ARRIVED", "DELIVERED", "COLLECTED", "CANCELLED"];

export function AdminVisitorsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<VisitorPassStatus | "">("");
  const [q, setQ] = useState("");
  const [delivery, setDelivery] = useState({ flatId: "", category: "FOOD", company: "" });

  const passes = useQuery({
    queryKey: ["visitors", "passes", status, q],
    queryFn: () => listPasses({ status: status || undefined, q: q || undefined, limit: 50 }),
  });
  const deliveries = useQuery({
    queryKey: ["visitors", "deliveries"],
    queryFn: () => listDeliveries({ limit: 30 }),
  });
  const flats = useQuery({ queryKey: ["visitors", "gate-flats"], queryFn: listGateFlats });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["visitors"] });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "APPROVE" | "REJECT" }) =>
      decidePass(id, decision),
    onSuccess: invalidate,
  });
  const setDeliveryStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: DeliveryStatus }) =>
      updateDeliveryStatus(id, next),
    onSuccess: invalidate,
  });
  const addDelivery = useMutation({
    mutationFn: () =>
      createDelivery({
        flatId: delivery.flatId,
        category: delivery.category,
        company: delivery.company.trim() || undefined,
      }),
    onSuccess: () => {
      setDelivery({ flatId: "", category: "FOOD", company: "" });
      void invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Visitors & deliveries" subtitle="Manage passes and gate deliveries." />

      <Card>
        <CardHeader>
          <CardTitle>Visitor passes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search name, phone or code"
              value={q}
              className="max-w-xs"
              onChange={(event) => setQ(event.target.value)}
            />
            <Select
              value={status}
              className="max-w-[12rem]"
              onChange={(event) => setStatus(event.target.value as VisitorPassStatus | "")}
            >
              <option value="">All statuses</option>
              {PASS_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>

          {passes.data && passes.data.data.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {passes.data.data.map((pass) => (
                <li key={pass.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pass.visitor.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {pass.flat.code} · {pass.code} · {formatDateTime(pass.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PassStatusBadge status={pass.status} />
                    {pass.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => decide.mutate({ id: pass.id, decision: "APPROVE" })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => decide.mutate({ id: pass.id, decision: "REJECT" })}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Alert>No passes match.</Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (delivery.flatId) addDelivery.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Flat</Label>
              <Select
                required
                value={delivery.flatId}
                onChange={(event) => setDelivery({ ...delivery, flatId: event.target.value })}
              >
                <option value="">Select flat</option>
                {flats.data?.map((flat) => (
                  <option key={flat.id} value={flat.id}>
                    {flat.code}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={delivery.category}
                onChange={(event) => setDelivery({ ...delivery, category: event.target.value })}
              >
                {["FOOD", "COURIER", "GROCERY", "MEDICINE", "OTHER"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={delivery.company}
                onChange={(event) => setDelivery({ ...delivery, company: event.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" loading={addDelivery.isPending}>
                Log delivery
              </Button>
            </div>
          </form>

          {deliveries.data && deliveries.data.data.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {deliveries.data.data.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">
                      {item.company ?? item.personName ?? item.category} · {item.flat?.code ?? "—"}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DeliveryStatusBadge status={item.status} />
                    <Select
                      value={item.status}
                      className="h-8 max-w-[10rem]"
                      onChange={(event) =>
                        setDeliveryStatus.mutate({
                          id: item.id,
                          next: event.target.value as DeliveryStatus,
                        })
                      }
                    >
                      {DELIVERY_NEXT.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No deliveries logged.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
