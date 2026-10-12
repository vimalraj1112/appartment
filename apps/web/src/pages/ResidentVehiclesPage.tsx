import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VehicleType } from "@superlink/shared";
import { createVehicle, deleteVehicle, listVehicles } from "../features/amenities/amenities-api";
import { vehicleTypeLabel } from "../features/amenities/components";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const TYPES: VehicleType[] = ["CAR", "BIKE", "EV", "BICYCLE"];

export function ResidentVehiclesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ regNumber: string; type: VehicleType; brand: string; color: string; isGuest: boolean }>(
    { regNumber: "", type: "CAR", brand: "", color: "", isGuest: false },
  );

  const vehicles = useQuery({
    queryKey: ["vehicles", "mine"],
    queryFn: () => listVehicles({ mine: true }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["vehicles"] });

  const create = useMutation({
    mutationFn: () =>
      createVehicle({
        regNumber: form.regNumber.trim(),
        type: form.type,
        brand: form.brand.trim() || undefined,
        color: form.color.trim() || undefined,
        isGuest: form.isGuest,
      }),
    onSuccess: () => {
      setForm({ regNumber: "", type: "CAR", brand: "", color: "", isGuest: false });
      invalidate();
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteVehicle(id), onSuccess: invalidate });

  const rows = vehicles.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Vehicles" subtitle="Register your vehicles and pre-authorise guest vehicles." />

      <Card>
        <CardHeader>
          <CardTitle>Add a vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
          >
            {create.isError && <Alert variant="destructive">{create.error.message}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="type">Type</Label>
                <Select
                  id="type"
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as VehicleType })}
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(event) => setForm({ ...form, brand: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="color">Colour</Label>
                <Input
                  id="color"
                  value={form.color}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isGuest}
                onChange={(event) => setForm({ ...form, isGuest: event.target.checked })}
              />
              This is a guest vehicle (pre-authorised entry)
            </label>
            <Button type="submit" loading={create.isPending}>
              <Icon name="plus" className="h-4 w-4" /> Add vehicle
            </Button>
          </form>
        </CardContent>
      </Card>

      {vehicles.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <Alert>You have not registered any vehicles.</Alert>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardContent className="flex items-center justify-between gap-3 p-5">
                <div className="space-y-1">
                  <p className="font-mono font-medium">{vehicle.regNumber}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {vehicleTypeLabel(vehicle.type)}
                    {vehicle.brand ? ` · ${vehicle.brand}` : ""}
                    {vehicle.color ? ` · ${vehicle.color}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {vehicle.isGuest && <Badge variant="warning">Guest</Badge>}
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={remove.isPending}
                    onClick={() => remove.mutate(vehicle.id)}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
