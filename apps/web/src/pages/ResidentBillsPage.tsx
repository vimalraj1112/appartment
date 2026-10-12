import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listBills } from "../features/billing/billing-api";
import { BillStatusBadge, formatDate, formatInr, formatPeriod } from "../features/billing/components";
import { Alert } from "../components/ui/alert";
import { Card, CardContent } from "../components/ui/card";
import { Icon } from "../components/ui/icons";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

export function ResidentBillsPage() {
  const bills = useQuery({
    queryKey: ["billing", "bills", "mine"],
    queryFn: () => listBills({ limit: 50 }),
  });

  const rows = bills.data?.data ?? [];
  const totalDue = rows
    .filter((bill) => bill.status !== "PAID")
    .reduce((sum, bill) => sum + bill.totalInr, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Bills & Payments" subtitle="View and settle your maintenance bills." />

      {bills.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <Alert>No bills have been raised for your flat yet.</Alert>
      ) : (
        <>
          {totalDue > 0 && (
            <Alert variant="warning">
              Outstanding balance across your bills: <strong>{formatInr(totalDue)}</strong>
            </Alert>
          )}
          <div className="space-y-3">
            {rows.map((bill) => (
              <Link key={bill.id} to={`/app/bills/${bill.id}`} className="block">
                <Card className="transition-colors hover:bg-[var(--color-muted)]/40">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="space-y-1">
                      <p className="font-medium">{formatPeriod(bill.period)} maintenance</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Flat {bill.flat.code} · Due {formatDate(bill.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatInr(bill.totalInr)}</span>
                      <BillStatusBadge status={bill.status} />
                      <Icon name="arrow-right" className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
