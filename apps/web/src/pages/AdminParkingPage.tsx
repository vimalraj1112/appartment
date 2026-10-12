import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ParkingSlotStatus } from "@superlink/shared";
import {
  assignSlot,
  createSlot,
  deleteSlot,
  endAssignment,
  listAssignments,
  listSlots,
  updateSlot,
} from "../features/amenities/amenities-api";
import { ParkingSlotStatusBadge, formatDate } from "../features/amenities/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const STATUSES: ParkingSlotStatus[] = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"];

export function AdminParkingPage() {
  const queryClient = useQueryClient();
  const [slotForm, setSlotForm] = useState<{ code: string; zone: string; status: ParkingSlotStatus }>({
    code: "",
    zone: "",
    status: "AVAILABLE",
  });
  const [assignTo, setAssignTo] = useState("");

  const slots = useQuery({ queryKey: ["parking", "slots"], queryFn: () => listSlots() });
  const assignments = useQuery({
    queryKey: ["parking", "assignments", "active"],
    queryFn: () => listAssignments({ active: true }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["parking"] });
  };

  const addSlot = useMutation({
    mutationFn: () => createSlot({ code: slotForm.code.trim(), zone: slotForm.zone.trim() || undefined, status: slotForm.status }),
    onSuccess: () => {
      setSlotForm({ code: "", zone: "", status: "AVAILABLE" });
      invalidate();
    },
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ParkingSlotStatus }) => updateSlot(id, { status }),
    onSuccess: invalidate,
  });
  const removeSlot = useMutation({ mutationFn: (id: string) => deleteSlot(id), onSuccess: invalidate });
  const assign = useMutation({
    mutationFn: (slotId: string) => assignSlot({ slotId }),
    onSuccess: () => {
      setAssignTo("");
      invalidate();
    },
  });
  const release = useMutation({ mutationFn: (id: string) => endAssignment(id), onSuccess: invalidate });

  const rows = slots.data?.data ?? [];
  const available = rows.filter((slot) => slot.status === "AVAILABLE");
  const activeAssignments = assignments.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Parking" subtitle="Manage slots and assignments." />

      <Card>
        <CardHeader>
          <CardTitle>Add a slot</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-4 sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              addSlot.mutate();
            }}
          >
            {addSlot.isError && (
              <div className="sm:col-span-4">
                <Alert variant="destructive">{addSlot.error.message}</Alert>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="code">Slot code</Label>
              <Input
                id="code"
                required
                placeholder="B-101"
                value={slotForm.code}
                onChange={(event) => setSlotForm({ ...slotForm, code: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone">Zone</Label>
              <Input
                id="zone"
                placeholder="Basement"
                value={slotForm.zone}
                onChange={(event) => setSlotForm({ ...slotForm, zone: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={slotForm.status}
                onChange={(event) => setSlotForm({ ...slotForm, status: event.target.value as ParkingSlotStatus })}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" loading={addSlot.isPending}>
              <Icon name="plus" className="h-4 w-4" /> Add slot
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Slots</h2>
        {slots.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : rows.length === 0 ? (
          <Alert>No parking slots yet.</Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((slot) => (
              <Card key={slot.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-mono font-medium">{slot.code}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{slot.zone ?? "No zone"}</p>
                    </div>
                    <ParkingSlotStatusBadge status={slot.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={slot.status}
                      onChange={(event) =>
                        setStatus.mutate({ id: slot.id, status: event.target.value as ParkingSlotStatus })
                      }
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={removeSlot.isPending}
                      onClick={() => removeSlot.mutate(slot.id)}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Active assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (assignTo) assign.mutate(assignTo);
            }}
          >
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="assignTo">Assign an available slot</Label>
              <Select id="assignTo" value={assignTo} onChange={(event) => setAssignTo(event.target.value)}>
                <option value="">Select a slot…</option>
                {available.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.code}
                    {slot.zone ? ` (${slot.zone})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={!assignTo} loading={assign.isPending}>
              Assign
            </Button>
          </form>

          {assign.isError && <Alert variant="destructive">{assign.error.message}</Alert>}

          {activeAssignments.length === 0 ? (
            <Alert>No active assignments.</Alert>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {activeAssignments.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="font-medium">Slot {assignment.slot.code}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Since {formatDate(assignment.startsAt)}
                      {assignment.flat ? ` · Flat ${assignment.flat.code}` : ""}
                      {assignment.vehicle ? ` · ${assignment.vehicle.regNumber}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={release.isPending}
                    onClick={() => release.mutate(assignment.id)}
                  >
                    Release
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
