import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignSubscription,
  createCommunity,
  listCommunities,
  listPlans,
  setCommunityStatus,
  type CreateCommunityInput,
  type PlatformCommunity,
} from "../features/platform/platform-api";
import {
  CommunityStatusBadge,
  SubscriptionStatusBadge,
  formatDate,
} from "../features/platform/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const EMPTY: CreateCommunityInput = { name: "", city: "", state: "", planCode: "" };

export function PlatformCommunitiesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreateCommunityInput>(EMPTY);

  const communities = useQuery({
    queryKey: ["platform", "communities", search],
    queryFn: () => listCommunities({ q: search || undefined, limit: 100 }),
  });
  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: listPlans });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["platform", "communities"] });
    queryClient.invalidateQueries({ queryKey: ["platform", "overview"] });
  };

  const create = useMutation({
    mutationFn: () =>
      createCommunity({
        name: form.name,
        city: form.city || undefined,
        state: form.state || undefined,
        planCode: form.planCode || undefined,
      }),
    onSuccess: () => {
      setForm(EMPTY);
      invalidate();
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PlatformCommunity["status"] }) =>
      setCommunityStatus(id, status),
    onSuccess: invalidate,
  });

  const assign = useMutation({
    mutationFn: ({ id, planCode }: { id: string; planCode: string }) => assignSubscription(id, { planCode }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Communities" subtitle="Create, suspend and manage every community." />

      <Card>
        <CardHeader>
          <CardTitle>Create a community</CardTitle>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(event) => setForm({ ...form, state: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan">Plan</Label>
                <Select
                  id="plan"
                  value={form.planCode ?? ""}
                  onChange={(event) => setForm({ ...form, planCode: event.target.value })}
                >
                  <option value="">Default plan</option>
                  {(plans.data ?? []).map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button type="submit" loading={create.isPending}>
              Create community
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">All communities</h2>
        <Input
          className="max-w-xs"
          placeholder="Search by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {communities.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (communities.data?.data.length ?? 0) === 0 ? (
        <Alert>No communities match your search.</Alert>
      ) : (
        <div className="space-y-3">
          {(communities.data?.data ?? []).map((community) => (
            <Card key={community.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{community.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {community.city ?? "—"} · {community._count?.flats ?? 0} flats · {community._count?.users ?? 0}{" "}
                      users · created {formatDate(community.createdAt)}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <CommunityStatusBadge status={community.status} />
                      {community.subscription ? (
                        <>
                          <SubscriptionStatusBadge status={community.subscription.status} />
                          <span className="text-xs text-[var(--color-muted-foreground)]">
                            {community.subscription.plan.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">No subscription</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={changeStatus.isPending}
                    onClick={() =>
                      changeStatus.mutate({
                        id: community.id,
                        status: community.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                      })
                    }
                  >
                    {community.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                  </Button>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-56 space-y-1.5">
                    <Label htmlFor={`plan-${community.id}`}>Subscription plan</Label>
                    <Select
                      id={`plan-${community.id}`}
                      defaultValue={community.subscription?.plan.code ?? ""}
                      onChange={(event) => {
                        const planCode = event.target.value;
                        if (planCode) assign.mutate({ id: community.id, planCode });
                      }}
                    >
                      <option value="" disabled>
                        Choose a plan
                      </option>
                      {(plans.data ?? []).map((plan) => (
                        <option key={plan.id} value={plan.code}>
                          {plan.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {assign.isError && <Alert variant="destructive">{assign.error.message}</Alert>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
