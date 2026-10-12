import { useQuery } from "@tanstack/react-query";
import { getBreakdown, getOverview, getTrends } from "../features/reports/reports-api";
import {
  DonutChart,
  GroupedBarChart,
  StatGrid,
  StatTile,
  formatMoney,
} from "../features/reports/components";
import { Alert } from "../components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

const PALETTE = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-destructive)",
  "#8b5cf6",
  "#0ea5e9",
];

const STATUS_ORDER = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

export function AdminReportsPage() {
  const overview = useQuery({ queryKey: ["reports", "overview"], queryFn: getOverview });
  const trends = useQuery({ queryKey: ["reports", "trends", 6], queryFn: () => getTrends(6) });
  const breakdown = useQuery({ queryKey: ["reports", "breakdown"], queryFn: getBreakdown });

  if (overview.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Community reports" />
        <Alert variant="destructive">We could not load the reports right now.</Alert>
      </div>
    );
  }

  const data = overview.data;
  const trendData = (trends.data ?? []).map((point) => ({
    label: point.label,
    values: { billedInr: point.billedInr, collectedInr: point.collectedInr },
  }));

  const complaintSlices = [...(breakdown.data?.complaintsByStatus ?? [])]
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    .map((row, index) => ({ label: titleCase(row.status), value: row.count, color: PALETTE[index % PALETTE.length] ?? "var(--color-primary)" }));

  const emergencySlices = (breakdown.data?.emergencyByCategory ?? []).map((row, index) => ({
    label: titleCase(row.category),
    value: row.count,
    color: PALETTE[index % PALETTE.length] ?? "var(--color-primary)",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community reports"
        subtitle={`Snapshot for ${data.billing.period}. Generated ${new Date(data.generatedAt).toLocaleString("en-IN")}.`}
      />

      <StatGrid>
        <StatTile label="Occupancy" value={`${data.flats.occupancyRate}%`} hint={`${data.flats.occupied}/${data.flats.total} flats`} />
        <StatTile label="Active residents" value={data.residents.active} hint={`${data.residents.invited} invited`} />
        <StatTile label="Open complaints" value={data.complaints.open} hint={`${data.complaints.total} total`} tone={data.complaints.open > 0 ? "warning" : "neutral"} />
        <StatTile label="Collection rate" value={`${data.billing.collectionRate}%`} hint={formatMoney(data.billing.collectedInr)} tone={data.billing.collectionRate >= 80 ? "positive" : "warning"} />
      </StatGrid>

      <StatGrid>
        <StatTile label="Billed this cycle" value={formatMoney(data.billing.billedInr)} />
        <StatTile label="Collected" value={formatMoney(data.billing.collectedInr)} tone="positive" />
        <StatTile label="Outstanding" value={formatMoney(data.billing.outstandingInr)} />
        <StatTile label="Overdue" value={formatMoney(data.billing.overdueInr)} tone={data.billing.overdueInr > 0 ? "negative" : "neutral"} />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Collections trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trends.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6" />
            </div>
          ) : trendData.length === 0 ? (
            <Alert>No billing history yet.</Alert>
          ) : (
            <GroupedBarChart
              data={trendData}
              series={[
                { key: "billedInr", label: "Billed", color: "var(--color-primary)" },
                { key: "collectedInr", label: "Collected", color: "var(--color-success)" },
              ]}
              format={formatMoney}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Complaints by status</CardTitle>
          </CardHeader>
          <CardContent>
            {complaintSlices.length === 0 ? (
              <Alert>No complaints recorded.</Alert>
            ) : (
              <DonutChart data={complaintSlices} centerLabel="complaints" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency alerts (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {emergencySlices.length === 0 ? (
              <Alert>No emergency alerts in the last 30 days.</Alert>
            ) : (
              <DonutChart data={emergencySlices} centerLabel="alerts" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expenses by category (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          {(breakdown.data?.expensesByCategory ?? []).length === 0 ? (
            <Alert>No expenses recorded in the last 30 days.</Alert>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {breakdown.data!.expensesByCategory.map((row) => (
                <li key={row.name} className="flex items-center justify-between py-2 text-sm">
                  <span>{row.name}</span>
                  <span className="font-medium tabular-nums">{formatMoney(row.amountInr)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
