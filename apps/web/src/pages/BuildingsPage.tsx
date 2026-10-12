import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FlatStatus } from "@superlink/shared";
import {
  bulkCreateFlats,
  createBuilding,
  createFlat,
  createFloor,
  deleteBuilding,
  deleteFlat,
  deleteFloor,
  getBuilding,
  listBuildings,
  listFlats,
  type FlatItem,
} from "../features/structure/structure-api";
import { ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

const STATUS_VARIANT: Record<FlatStatus, "success" | "muted" | "destructive"> = {
  OCCUPIED: "success",
  VACANT: "muted",
  BLOCKED: "destructive",
};

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function BuildingsPage() {
  const queryClient = useQueryClient();
  const [buildingName, setBuildingName] = useState("");
  const [towerCode, setTowerCode] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  const [floorNumber, setFloorNumber] = useState("");
  const [floorLabel, setFloorLabel] = useState("");

  const [flatCode, setFlatCode] = useState("");
  const [flatType, setFlatType] = useState("");
  const [flatPrefix, setFlatPrefix] = useState("");
  const [flatStart, setFlatStart] = useState("");
  const [flatCount, setFlatCount] = useState("");

  const buildingsQuery = useQuery({ queryKey: ["buildings"], queryFn: listBuildings });
  const buildingQuery = useQuery({
    queryKey: ["building", selectedBuildingId],
    queryFn: () => getBuilding(selectedBuildingId as string),
    enabled: Boolean(selectedBuildingId),
  });
  const flatsQuery = useQuery({
    queryKey: ["flats", selectedFloorId],
    queryFn: () => listFlats({ floorId: selectedFloorId as string, limit: 100 }),
    enabled: Boolean(selectedFloorId),
  });

  const invalidateBuildings = () => {
    queryClient.invalidateQueries({ queryKey: ["buildings"] });
    queryClient.invalidateQueries({ queryKey: ["building", selectedBuildingId] });
  };

  const createBuildingMutation = useMutation({
    mutationFn: () =>
      createBuilding({
        name: buildingName.trim(),
        towerCode: towerCode.trim() || undefined,
        floorsCount: 0,
      }),
    onSuccess: (building) => {
      setBuildingName("");
      setTowerCode("");
      setSelectedBuildingId(building.id);
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
    },
  });

  const createFloorMutation = useMutation({
    mutationFn: () =>
      createFloor(selectedBuildingId as string, {
        number: Number(floorNumber),
        label: floorLabel.trim(),
      }),
    onSuccess: () => {
      setFloorNumber("");
      setFloorLabel("");
      invalidateBuildings();
    },
  });

  const createFlatMutation = useMutation({
    mutationFn: () =>
      createFlat({
        floorId: selectedFloorId as string,
        code: flatCode.trim(),
        type: flatType.trim() || undefined,
      }),
    onSuccess: () => {
      setFlatCode("");
      queryClient.invalidateQueries({ queryKey: ["flats", selectedFloorId] });
      invalidateBuildings();
    },
  });

  const bulkMutation = useMutation({
    mutationFn: () =>
      bulkCreateFlats({
        floorId: selectedFloorId as string,
        prefix: flatPrefix,
        start: Number(flatStart),
        count: Number(flatCount),
        pad: Math.max(2, String(flatStart).length),
      }),
    onSuccess: () => {
      setFlatStart("");
      setFlatCount("");
      queryClient.invalidateQueries({ queryKey: ["flats", selectedFloorId] });
      invalidateBuildings();
    },
  });

  const removeBuilding = useMutation({
    mutationFn: (id: string) => deleteBuilding(id),
    onSuccess: (_data, id) => {
      if (id === selectedBuildingId) {
        setSelectedBuildingId(null);
        setSelectedFloorId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
    },
  });

  const removeFloor = useMutation({
    mutationFn: (id: string) => deleteFloor(id),
    onSuccess: (_data, id) => {
      if (id === selectedFloorId) setSelectedFloorId(null);
      invalidateBuildings();
    },
  });

  const removeFlat = useMutation({
    mutationFn: (id: string) => deleteFlat(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flats", selectedFloorId] });
      invalidateBuildings();
    },
  });

  const onAddBuilding = (event: FormEvent) => {
    event.preventDefault();
    if (!buildingName.trim()) return;
    createBuildingMutation.mutate();
  };

  const onAddFloor = (event: FormEvent) => {
    event.preventDefault();
    if (!floorLabel.trim() || !floorNumber) return;
    createFloorMutation.mutate();
  };

  const onAddFlat = (event: FormEvent) => {
    event.preventDefault();
    if (!flatCode.trim()) return;
    createFlatMutation.mutate();
  };

  const onBulk = (event: FormEvent) => {
    event.preventDefault();
    if (!flatStart || !flatCount) return;
    bulkMutation.mutate();
  };

  const buildings = buildingsQuery.data ?? [];
  const floors = buildingQuery.data?.floors ?? [];
  const flats: FlatItem[] = flatsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Buildings & flats" subtitle="Define towers, floors and units for your community." />

      <Card>
        <CardHeader>
          <CardTitle>Add a building</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={onAddBuilding}>
            <div className="min-w-[12rem] flex-1 space-y-2">
              <Label htmlFor="buildingName">Name</Label>
              <Input
                id="buildingName"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="Tower A"
              />
            </div>
            <div className="w-32 space-y-2">
              <Label htmlFor="towerCode">Tower code</Label>
              <Input
                id="towerCode"
                value={towerCode}
                onChange={(e) => setTowerCode(e.target.value)}
                placeholder="A"
              />
            </div>
            <Button type="submit" loading={createBuildingMutation.isPending}>
              <Icon name="plus" className="h-4 w-4" />
              Add building
            </Button>
          </form>
          {createBuildingMutation.error && (
            <Alert variant="destructive" className="mt-3">
              {errorText(createBuildingMutation.error, "Could not add building.")}
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Buildings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {buildingsQuery.isLoading && <Spinner />}
            {buildings.length === 0 && !buildingsQuery.isLoading && (
              <p className="text-sm text-[var(--color-muted-foreground)]">No buildings yet.</p>
            )}
            {buildings.map((building) => (
              <div
                key={building.id}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 transition-colors",
                  selectedBuildingId === building.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-[var(--color-border)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBuildingId(building.id);
                    setSelectedFloorId(null);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Icon name="building" className="h-5 w-5 text-[var(--color-primary)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{building.name}</span>
                    <span className="block text-xs text-[var(--color-muted-foreground)]">
                      {building.floorCount} floors · {building.flatCount} flats
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeBuilding.mutate(building.id)}
                  className="rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                  aria-label="Delete building"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{selectedBuildingId ? "Floors" : "Select a building"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedBuildingId && (
              <form className="flex items-end gap-2" onSubmit={onAddFloor}>
                <div className="w-20 space-y-2">
                  <Label htmlFor="floorNumber">No.</Label>
                  <Input
                    id="floorNumber"
                    type="number"
                    value={floorNumber}
                    onChange={(e) => setFloorNumber(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="floorLabel">Label</Label>
                  <Input
                    id="floorLabel"
                    value={floorLabel}
                    onChange={(e) => setFloorLabel(e.target.value)}
                    placeholder="First floor"
                  />
                </div>
                <Button type="submit" size="icon" loading={createFloorMutation.isPending} aria-label="Add floor">
                  <Icon name="plus" className="h-4 w-4" />
                </Button>
              </form>
            )}
            {createFloorMutation.error && (
              <Alert variant="destructive">
                {errorText(createFloorMutation.error, "Could not add floor.")}
              </Alert>
            )}
            <div className="space-y-2">
              {floors.map((floor) => (
                <div
                  key={floor.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border p-2.5 text-sm",
                    selectedFloorId === floor.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)]",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelectedFloorId(floor.id)}
                  >
                    <span className="block truncate font-medium">{floor.label}</span>
                    <span className="block text-xs text-[var(--color-muted-foreground)]">
                      Level {floor.number} · {floor.flatCount} flats
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFloor.mutate(floor.id)}
                    className="rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                    aria-label="Delete floor"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {selectedBuildingId && floors.length === 0 && (
                <p className="text-sm text-[var(--color-muted-foreground)]">No floors yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{selectedFloorId ? "Flats" : "Select a floor"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedFloorId && (
              <>
                <form className="flex items-end gap-2" onSubmit={onAddFlat}>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="flatCode">Code</Label>
                    <Input
                      id="flatCode"
                      value={flatCode}
                      onChange={(e) => setFlatCode(e.target.value)}
                      placeholder="A-101"
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Label htmlFor="flatType">Type</Label>
                    <Input id="flatType" value={flatType} onChange={(e) => setFlatType(e.target.value)} placeholder="2BHK" />
                  </div>
                  <Button type="submit" size="icon" loading={createFlatMutation.isPending} aria-label="Add flat">
                    <Icon name="plus" className="h-4 w-4" />
                  </Button>
                </form>
                {createFlatMutation.error && (
                  <Alert variant="destructive">
                    {errorText(createFlatMutation.error, "Could not add flat.")}
                  </Alert>
                )}

                <form className="flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-3" onSubmit={onBulk}>
                  <div className="w-20 space-y-2">
                    <Label htmlFor="flatPrefix">Prefix</Label>
                    <Input id="flatPrefix" value={flatPrefix} onChange={(e) => setFlatPrefix(e.target.value)} placeholder="A-" />
                  </div>
                  <div className="w-20 space-y-2">
                    <Label htmlFor="flatStart">Start</Label>
                    <Input id="flatStart" type="number" value={flatStart} onChange={(e) => setFlatStart(e.target.value)} />
                  </div>
                  <div className="w-20 space-y-2">
                    <Label htmlFor="flatCount">Count</Label>
                    <Input id="flatCount" type="number" value={flatCount} onChange={(e) => setFlatCount(e.target.value)} />
                  </div>
                  <Button type="submit" variant="outline" loading={bulkMutation.isPending}>
                    Bulk add
                  </Button>
                </form>
                {bulkMutation.data && (
                  <Alert variant="success">
                    Created {bulkMutation.data.created}, skipped {bulkMutation.data.skipped}.
                  </Alert>
                )}
              </>
            )}

            <div className="space-y-2">
              {flats.map((flat) => (
                <div
                  key={flat.id}
                  className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium">{flat.code}</span>
                    {flat.type && (
                      <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">{flat.type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[flat.status]}>{flat.status.toLowerCase()}</Badge>
                    <button
                      type="button"
                      onClick={() => removeFlat.mutate(flat.id)}
                      className="rounded p-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                      aria-label="Delete flat"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {selectedFloorId && flats.length === 0 && (
                <p className="text-sm text-[var(--color-muted-foreground)]">No flats yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
