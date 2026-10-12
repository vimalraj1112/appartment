import { useQuery } from "@tanstack/react-query";
import { getScorecard } from "../features/reports/reports-api";
import { MetricBar, ScoreRing, StatGrid, StatTile } from "../features/reports/components";
import { Alert } from "../components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function AdminScorecardPage() {
  const scorecard = useQuery({ queryKey: ["reports", "scorecard"], queryFn: getScorecard });

  if (scorecard.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (scorecard.isError || !scorecard.data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Health scorecard" />
        <Alert variant="destructive">We could not load the scorecard right now.</Alert>
      </div>
    );
  }

  const data = scorecard.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community health scorecard"
        subtitle={`Generated ${new Date(data.generatedAt).toLocaleString("en-IN")}.`}
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-8 p-6 sm:flex-row sm:justify-around">
          <ScoreRing score={data.overall} grade={data.grade} />
          <div className="w-full max-w-md space-y-4">
            {data.metrics.map((metric) => (
              <MetricBar key={metric.key} label={metric.label} score={metric.score} detail={metric.detail} />
            ))}
          </div>
        </CardContent>
      </Card>

      <StatGrid>
        <StatTile label="Residents" value={data.summary.residents} />
        <StatTile label="Flats" value={data.summary.flats} />
        <StatTile label="Open complaints" value={data.summary.openComplaints} tone={data.summary.openComplaints > 0 ? "warning" : "neutral"} />
        <StatTile
          label="Avg resolution"
          value={data.summary.averageResolutionHours !== null ? `${data.summary.averageResolutionHours}h` : "—"}
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>How the score is calculated</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
            {data.metrics.map((metric) => (
              <li key={metric.key} className="flex items-center justify-between gap-3">
                <span>
                  <span className="font-medium text-[var(--color-foreground)]">{metric.label}</span> · weight {metric.weight}%
                </span>
                <span className="tabular-nums">{metric.score}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
