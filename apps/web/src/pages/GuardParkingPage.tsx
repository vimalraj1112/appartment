import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVisitorParking,
  listSlots,
  listVisitorParking,
  type ParkingVisitor,
} from "../features/amenities/amenities-api";
import { ParkingSlotStatusBadge, formatDate } from "../features/amenities/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function GuardParkingPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ regNumber: "", name: "" });

  const slots = useQuery({ queryKey: ["parking", "slots"], queryFn: () => listSlots() });
  const visitors = useQuery({
    queryKey: ["parking", "visitors", "active"],
    queryFn: () => listVisitorParking({ active: true }),
  });

  const create = useMutation({
    mutationFn: () => createVisitorParking({ regNumber: form.regNumber.trim(), name: form.name.trim() || undefined }),
    onSuccess: () => {
      setForm({ regNumber: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["parking", "visitors"] });
    },
  });

  const rows = slots.data?.data ?? [];
  const activeVisitors: ParkingVisitor[] = visitors.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Parking" subtitle="Slot availability and visitor vehicle entry." />

      <Card>
        <CardHeader>
          <CardTitle>Register visitor vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-3 sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
          >
            {create.isError && (
              <div className="sm:col-span-3">
                <Alert variant="destructive">{create.error.message}</Alert>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="regNumber">Registration number</Label>
              <Input
                id="regNumber"
                required
                placeholder="KA01AB1234"
                value={form.regNumber}
                onChange={(event) => setForm({ ...form, regNumber: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Visitor name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <Button type="submit" loading={create.isPending}>
              Register
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Currently parked visitors</h2>
        {visitors.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : activeVisitors.length === 0 ? (
          <Alert>No visitor vehicles registered.</Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeVisitors.map((visitor) => (
              <Card key={visitor.id}>
                <CardContent className="space-y-1 p-5">
                  <p className="font-mono font-medium">{visitor.regNumber}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {visitor.name ?? "Guest"}
                    {visitor.slot ? ` · Slot ${visitor.slot.code}` : ""}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    From {formatDate(visitor.validFrom)}
                    {visitor.validTo ? ` until ${formatDate(visitor.validTo)}` : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Slot availability</h2>
        {slots.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : rows.length === 0 ? (
          <Alert>No parking slots configured.</Alert>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((slot) => (
              <Card key={slot.id}>
                <CardContent className="flex items-center justify-between gap-2 p-4">
                  <div>
                    <p className="font-mono font-medium">{slot.code}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{slot.zone ?? "No zone"}</p>
                  </div>
                  <ParkingSlotStatusBadge status={slot.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
