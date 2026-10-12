import { useQuery } from "@tanstack/react-query";
import { getOverview } from "../features/platform/platform-api";
import { CommunityStatusBadge, formatInr } from "../features/platform/components";
import { Alert } from "../components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function PlatformOverviewPage() {
  const overview = useQuery({ queryKey: ["platform", "overview"], queryFn: getOverview });

  if (overview.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return <Alert variant="destructive">{overview.error?.message ?? "Unable to load the overview."}</Alert>;
  }

  const data = overview.data;
  const maxGrowth = Math.max(1, ...data.growth.map((point) => point.count));

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" subtitle="Health of every community on SuperLink." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Communities"
          value={data.communities.total}
          hint={`${data.communities.active} active · ${data.communities.suspended} suspended`}
        />
        <StatCard label="Users" value={data.users.total} hint={`${data.users.residents} residents`} />
        <StatCard label="Flats" value={data.flats.total} hint="across all communities" />
        <StatCard label="MRR" value={formatInr(data.revenue.mrrInr)} hint={`${data.plans.active} active plans`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Metric label="Active" value={data.subscriptions.active} />
            <Metric label="Trial" value={data.subscriptions.trial} />
            <Metric label="Past due" value={data.subscriptions.pastDue} />
            <Metric label="Cancelled" value={data.subscriptions.cancelled} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New communities (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-3">
              {data.growth.map((point) => (
                <div key={point.period} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-[var(--color-primary)]/70"
                    style={{ height: `${Math.max(4, (point.count / maxGrowth) * 100)}%` }}
                    title={`${point.count} communities`}
                  />
                  <span className="text-[10px] text-[var(--color-muted-foreground)]">{point.period.slice(5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent communities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recentCommunities.map((community) => (
            <div key={community.id} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{community.name}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {community.city ?? "—"} · joined {new Date(community.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <CommunityStatusBadge status={community.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
