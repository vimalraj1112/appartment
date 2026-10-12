import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import type { PaymentProvider } from "@superlink/shared";
import { getBill, payBill } from "../features/billing/billing-api";
import {
  BillStatusBadge,
  PaymentStatusBadge,
  formatDate,
  formatInr,
  formatPeriod,
  providerLabel,
} from "../features/billing/components";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/select";
import { Spinner } from "../components/ui/spinner";

const PROVIDERS: Array<"MOCK" | "UPI"> = ["MOCK", "UPI"];

export function ResidentBillDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const bill = useQuery({ queryKey: ["billing", "bill", id], queryFn: () => getBill(id) });

  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<"MOCK" | "UPI">("MOCK");
  const [receiptNo, setReceiptNo] = useState<string | null>(null);

  const due = bill.data?.dueInr ?? 0;
  useEffect(() => {
    setAmount(due > 0 ? String(due) : "");
  }, [due]);

  const pay = useMutation({
    mutationFn: () =>
      payBill(id, {
        amountInr: Number(amount) || undefined,
        provider,
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: (result) => {
      setReceiptNo(result.payment.receipt?.receiptNo ?? null);
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  if (bill.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (bill.isError || !bill.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bill" />
        <Alert variant="destructive">We could not load that bill.</Alert>
        <Link to="/app/bills">
          <Button variant="outline" size="sm">
            Back to bills
          </Button>
        </Link>
      </div>
    );
  }

  const { bill: detail, paidInr, dueInr } = bill.data;
  const settled = dueInr <= 0 || detail.status === "PAID";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${formatPeriod(detail.period)} maintenance`}
        subtitle={`Flat ${detail.flat.code} · Due ${formatDate(detail.dueDate)}`}
        actions={
          <Link to="/app/bills">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
        }
      />

      {receiptNo && (
        <Alert variant="success">
          Payment received. Receipt <strong>{receiptNo}</strong> has been issued.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bill breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span>{formatInr(item.amountInr)}</span>
              </div>
            ))}
            {detail.items.length === 0 && (
              <p className="text-sm text-[var(--color-muted-foreground)]">No line items.</p>
            )}
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 font-medium">
              <span>Total</span>
              <span>{formatInr(detail.totalInr)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
              <span>Paid</span>
              <span>{formatInr(paidInr)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>Outstanding</span>
              <div className="flex items-center gap-2">
                <span>{formatInr(dueInr)}</span>
                <BillStatusBadge status={detail.status} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pay now</CardTitle>
          </CardHeader>
          <CardContent>
            {settled ? (
              <Alert variant="success">This bill is fully paid. Thank you!</Alert>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setReceiptNo(null);
                  pay.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount (INR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    max={dueInr}
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Outstanding {formatInr(dueInr)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provider">Method</Label>
                  <Select
                    id="provider"
                    value={provider}
                    onChange={(event) => setProvider(event.target.value as "MOCK" | "UPI")}
                  >
                    {PROVIDERS.map((value) => (
                      <option key={value} value={value}>
                        {providerLabel(value as PaymentProvider)}
                      </option>
                    ))}
                  </Select>
                </div>

                {pay.isError && (
                  <Alert variant="destructive">
                    {(pay.error as Error).message || "Payment could not be completed."}
                  </Alert>
                )}

                <Button type="submit" className="w-full" loading={pay.isPending} disabled={settled}>
                  Pay {formatInr(Number(amount) || dueInr)}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.payments.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No payments recorded yet.</p>
          ) : (
            detail.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatInr(payment.amountInr)} · {providerLabel(payment.provider)}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {formatDate(payment.createdAt)}
                    {payment.receipt ? ` · Receipt ${payment.receipt.receiptNo}` : ""}
                  </p>
                </div>
                <PaymentStatusBadge status={payment.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
