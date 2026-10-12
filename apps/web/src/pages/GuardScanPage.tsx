import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VerifyResult } from "../features/visitors/visitor-api";
import {
  listGateFlats,
  registerEntry,
  verifyPass,
  walkIn,
} from "../features/visitors/visitor-api";
import { PassStatusBadge } from "../features/visitors/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";

export function GuardScanPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [checkedIn, setCheckedIn] = useState<string | null>(null);
  const [walk, setWalk] = useState({ name: "", phone: "", flatId: "", purpose: "" });
  const [walkMessage, setWalkMessage] = useState<string | null>(null);

  const flats = useQuery({ queryKey: ["visitors", "gate-flats"], queryFn: listGateFlats });

  const verify = useMutation({
    mutationFn: () => verifyPass(code.trim()),
    onSuccess: (data) => {
      setResult(data);
      setCheckedIn(null);
    },
  });

  const entry = useMutation({
    mutationFn: (direction: "IN" | "OUT") =>
      registerEntry({
        passId: result?.pass.id,
        visitorId: result?.pass.visitor.id ?? "",
        direction,
        method: "QR",
      }),
    onSuccess: (_data, direction) => {
      setCheckedIn(direction === "IN" ? "Checked in" : "Checked out");
      void queryClient.invalidateQueries({ queryKey: ["visitors"] });
    },
  });

  const createWalkIn = useMutation({
    mutationFn: () =>
      walkIn({
        name: walk.name.trim(),
        phone: walk.phone.trim() || undefined,
        flatId: walk.flatId,
        purpose: walk.purpose.trim() || undefined,
      }),
    onSuccess: (data) => {
      setWalkMessage(`Requested. Pass code ${data.pass.code} sent for approval.`);
      setWalk({ name: "", phone: "", flatId: "", purpose: "" });
      void queryClient.invalidateQueries({ queryKey: ["visitors"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Gate scan" subtitle="Verify a pass or register a walk-in visitor." />

      <Card>
        <CardHeader>
          <CardTitle>Verify pass</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.trim().length >= 4) verify.mutate();
            }}
          >
            <Input
              placeholder="Enter pass code"
              value={code}
              className="font-mono tracking-widest"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <Button type="submit" loading={verify.isPending}>
              Verify
            </Button>
          </form>

          {verify.isError && <Alert variant="destructive">No pass matches that code.</Alert>}

          {result && (
            <div className="space-y-4 rounded-md border border-[var(--color-border)] p-4">
              {result.watchlisted && (
                <Alert variant="destructive">
                  Watchlist match: {result.watchlist?.name} — {result.watchlist?.reason}
                </Alert>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold">{result.pass.visitor.name}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {result.pass.visitor.phone ?? "No phone"}
                  </p>
                </div>
                <PassStatusBadge status={result.pass.status} />
              </div>
              <p className="text-sm">
                {result.pass.flat.floor.building.name} · Flat {result.pass.flat.code}
              </p>
              {checkedIn ? (
                <Alert variant="success">{checkedIn}.</Alert>
              ) : (
                <div className="flex gap-2">
                  <Button
                    loading={entry.isPending}
                    disabled={result.pass.status !== "ACTIVE"}
                    onClick={() => entry.mutate("IN")}
                  >
                    Check in
                  </Button>
                  <Button variant="outline" loading={entry.isPending} onClick={() => entry.mutate("OUT")}>
                    Check out
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Walk-in visitor</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createWalkIn.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="walk-name">Name</Label>
                <Input
                  id="walk-name"
                  required
                  value={walk.name}
                  onChange={(event) => setWalk({ ...walk, name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="walk-phone">Phone</Label>
                <Input
                  id="walk-phone"
                  value={walk.phone}
                  onChange={(event) => setWalk({ ...walk, phone: event.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="walk-flat">Flat</Label>
                <Select
                  id="walk-flat"
                  required
                  value={walk.flatId}
                  onChange={(event) => setWalk({ ...walk, flatId: event.target.value })}
                >
                  <option value="">Select flat</option>
                  {flats.data?.map((flat) => (
                    <option key={flat.id} value={flat.id}>
                      {flat.floor.building.name} · {flat.code}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="walk-purpose">Purpose</Label>
                <Input
                  id="walk-purpose"
                  value={walk.purpose}
                  onChange={(event) => setWalk({ ...walk, purpose: event.target.value })}
                />
              </div>
            </div>

            {walkMessage && <Alert variant="success">{walkMessage}</Alert>}
            {createWalkIn.isError && (
              <Alert variant="destructive">Could not register the visitor.</Alert>
            )}

            <Button type="submit" loading={createWalkIn.isPending}>
              Request approval
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
