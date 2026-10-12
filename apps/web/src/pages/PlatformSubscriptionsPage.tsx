import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from "@superlink/shared";
import { listSubscriptions } from "../features/platform/platform-api";
import {
  CommunityStatusBadge,
  SubscriptionStatusBadge,
  formatDate,
  formatInr,
} from "../features/platform/components";
import { Alert } from "../components/ui/alert";
import { Card, CardContent } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

export function PlatformSubscriptionsPage() {
  const [status, setStatus] = useState<SubscriptionStatus | "">("");

  const subscriptions = useQuery({
    queryKey: ["platform", "subscriptions", status],
    queryFn: () => listSubscriptions({ status: status || undefined, limit: 100 }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Every community's plan, status and billing period."
        actions={
          <Select
            className="w-44"
            value={status}
            onChange={(event) => setStatus(event.target.value as SubscriptionStatus | "")}
          >
            <option value="">All statuses</option>
            {SUBSCRIPTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replace("_", " ")}
              </option>
            ))}
          </Select>
        }
      />

      {subscriptions.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (subscriptions.data?.data.length ?? 0) === 0 ? (
        <Alert>No subscriptions found.</Alert>
      ) : (
        <div className="space-y-3">
          {(subscriptions.data?.data ?? []).map((subscription) => (
            <Card key={subscription.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{subscription.community.name}</p>
                    <CommunityStatusBadge status={subscription.community.status} />
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {subscription.plan.name} · {formatInr(subscription.plan.priceMonthlyInr)}/mo · renews{" "}
                    {formatDate(subscription.periodEnd)}
                  </p>
                </div>
                <SubscriptionStatusBadge status={subscription.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
