import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getPublicPass } from "../features/visitors/visitor-api";
import { PassStatusBadge, formatDateTime } from "../features/visitors/components";
import { Alert } from "../components/ui/alert";
import { Card, CardContent } from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";

export function PublicPassPage() {
  const { token = "" } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-pass", token],
    queryFn: () => getPublicPass(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (isError || !data) {
    return <Alert variant="destructive">This visitor pass is invalid or has expired.</Alert>;
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">{data.communityName}</p>
        <div>
          <p className="text-lg font-semibold">{data.visitorName}</p>
          <PassStatusBadge status={data.status} />
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted-foreground)]">Pass code</p>
          <p className="font-mono text-2xl tracking-[0.3em]">{data.code}</p>
        </div>
        <p className="text-sm">
          Flat {data.flatCode} · {data.type === "SINGLE_USE" ? "Single use" : "Time window"}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Valid {formatDateTime(data.validFrom)}
          {data.validTo ? ` — ${formatDateTime(data.validTo)}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}
