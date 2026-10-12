import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPlan,
  listPlans,
  updatePlan,
  type PlanInput,
} from "../features/platform/platform-api";
import { formatInr } from "../features/platform/components";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

const EMPTY: PlanInput = { code: "", name: "", priceMonthlyInr: 0, flatLimit: 100, features: [] };

export function PlatformPlansPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlanInput>(EMPTY);
  const [featuresText, setFeaturesText] = useState("");

  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: listPlans });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });

  const create = useMutation({
    mutationFn: () =>
      createPlan({
        ...form,
        features: featuresText
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      setForm(EMPTY);
      setFeaturesText("");
      invalidate();
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updatePlan(id, { isActive }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription plans" subtitle="Pricing tiers that communities subscribe to." />

      <Card>
        <CardHeader>
          <CardTitle>Add a plan</CardTitle>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  required
                  placeholder="growth"
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value.toLowerCase() })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Price / month (INR)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={form.priceMonthlyInr}
                  onChange={(event) => setForm({ ...form, priceMonthlyInr: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="flatLimit">Flat limit</Label>
                <Input
                  id="flatLimit"
                  type="number"
                  min={0}
                  value={form.flatLimit}
                  onChange={(event) => setForm({ ...form, flatLimit: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="features">Features (comma separated)</Label>
                <Input
                  id="features"
                  placeholder="aiAssistant, analytics"
                  value={featuresText}
                  onChange={(event) => setFeaturesText(event.target.value)}
                />
              </div>
            </div>
            <Button type="submit" loading={create.isPending}>
              Add plan
            </Button>
          </form>
        </CardContent>
      </Card>

      {plans.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (plans.data?.length ?? 0) === 0 ? (
        <Alert>No plans yet.</Alert>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(plans.data ?? []).map((plan) => (
            <Card key={plan.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {plan.code} · up to {plan.flatLimit} flats
                    </p>
                  </div>
                  <Badge variant={plan.isActive ? "success" : "muted"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-lg font-semibold">
                  {formatInr(plan.priceMonthlyInr)}
                  <span className="text-xs font-normal text-[var(--color-muted-foreground)]"> / month</span>
                </p>
                {plan.features.length > 0 && (
                  <p className="text-xs text-[var(--color-muted-foreground)]">{plan.features.join(" · ")}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  loading={toggle.isPending}
                  onClick={() => toggle.mutate({ id: plan.id, isActive: !plan.isActive })}
                >
                  {plan.isActive ? "Disable" : "Enable"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
