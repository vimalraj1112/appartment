import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BillStatus } from "@superlink/shared";
import {
  generateBills,
  getFinanceSummary,
  listBills,
  listConfigs,
  listPayments,
  markOverdue,
  recordManualPayment,
  upsertConfig,
  type MaintenanceBill,
} from "../features/billing/billing-api";
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

const BILL_STATUSES: BillStatus[] = ["PENDING", "PARTIAL", "PAID", "OVERDUE"];
const MANUAL_PROVIDERS = ["CASH", "BANK_TRANSFER", "UPI"] as const;

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function AdminBillingPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod());

  const summary = useQuery({
    queryKey: ["billing", "summary", period],
    queryFn: () => getFinanceSummary(period),
  });

  // ----- Config -----
  const configs = useQuery({ queryKey: ["billing", "config"], queryFn: () => listConfigs() });
  const [configForm, setConfigForm] = useState({
    flatType: "",
    baseInr: "0",
    waterInr: "0",
    parkingInr: "0",
    lateFeeInr: "0",
    graceDays: "5",
  });
  const saveConfig = useMutation({
    mutationFn: () =>
      upsertConfig({
        flatType: configForm.flatType.trim(),
        baseInr: Number(configForm.baseInr) || 0,
        waterInr: Number(configForm.waterInr) || 0,
        parkingInr: Number(configForm.parkingInr) || 0,
        lateFeeInr: Number(configForm.lateFeeInr) || 0,
        graceDays: Number(configForm.graceDays) || 0,
      }),
    onSuccess: () => {
      setConfigForm({ flatType: "", baseInr: "0", waterInr: "0", parkingInr: "0", lateFeeInr: "0", graceDays: "5" });
      void queryClient.invalidateQueries({ queryKey: ["billing", "config"] });
    },
  });

  // ----- Generate -----
  const [generateForm, setGenerateForm] = useState({ period: currentPeriod(), dueDate: "" });
  const generate = useMutation({
    mutationFn: () =>
      generateBills({
        period: generateForm.period,
        dueDate: generateForm.dueDate ? new Date(generateForm.dueDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  const overdue = useMutation({
    mutationFn: () => markOverdue(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  // ----- Bills -----
  const [filters, setFilters] = useState<{ period: string; status: "" | BillStatus }>({
    period: "",
    status: "",
  });
  const bills = useQuery({
    queryKey: ["billing", "bills", "admin", filters],
    queryFn: () =>
      listBills({
        period: filters.period || undefined,
        status: filters.status || undefined,
        limit: 50,
      }),
  });

  // ----- Manual payment -----
  const [collect, setCollect] = useState<MaintenanceBill | null>(null);
  const [manualForm, setManualForm] = useState({
    amountInr: "",
    provider: "CASH" as (typeof MANUAL_PROVIDERS)[number],
    note: "",
  });
  const manual = useMutation({
    mutationFn: () =>
      recordManualPayment({
        billId: collect?.id ?? "",
        amountInr: Number(manualForm.amountInr),
        provider: manualForm.provider,
        note: manualForm.note.trim() || undefined,
      }),
    onSuccess: () => {
      setCollect(null);
      setManualForm({ amountInr: "", provider: "CASH", note: "" });
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  // ----- Ledger -----
  const ledger = useQuery({
    queryKey: ["billing", "payments", "admin"],
    queryFn: () => listPayments({ limit: 25 }),
  });

  const rows = bills.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance & billing"
        subtitle="Configure charges, raise bills, collect payments and reconcile."
      />

      {/* Summary */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="summary-period">Summary period</Label>
            <Input
              id="summary-period"
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="w-44"
            />
          </div>
        </div>
        {summary.data && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Billed" value={formatInr(summary.data.billedInr)} />
            <StatCard label="Collected" value={formatInr(summary.data.collectedInr)} />
            <StatCard label="Outstanding" value={formatInr(summary.data.outstandingInr)} />
            <StatCard label="Expenses (total)" value={formatInr(summary.data.totalExpensesInr)} />
          </div>
        )}
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance charges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-4 sm:grid-cols-6"
            onSubmit={(event) => {
              event.preventDefault();
              saveConfig.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="flatType">Flat type</Label>
              <Input
                id="flatType"
                required
                placeholder="2BHK"
                value={configForm.flatType}
                onChange={(event) => setConfigForm({ ...configForm, flatType: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="baseInr">Base (₹)</Label>
              <Input
                id="baseInr"
                type="number"
                min={0}
                value={configForm.baseInr}
                onChange={(event) => setConfigForm({ ...configForm, baseInr: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waterInr">Water (₹)</Label>
              <Input
                id="waterInr"
                type="number"
                min={0}
                value={configForm.waterInr}
                onChange={(event) => setConfigForm({ ...configForm, waterInr: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parkingInr">Parking (₹)</Label>
              <Input
                id="parkingInr"
                type="number"
                min={0}
                value={configForm.parkingInr}
                onChange={(event) => setConfigForm({ ...configForm, parkingInr: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lateFeeInr">Late fee (₹)</Label>
              <Input
                id="lateFeeInr"
                type="number"
                min={0}
                value={configForm.lateFeeInr}
                onChange={(event) => setConfigForm({ ...configForm, lateFeeInr: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="graceDays">Grace (days)</Label>
              <Input
                id="graceDays"
                type="number"
                min={0}
                value={configForm.graceDays}
                onChange={(event) => setConfigForm({ ...configForm, graceDays: event.target.value })}
              />
            </div>
            <div className="sm:col-span-6">
              {saveConfig.isError && (
                <Alert variant="destructive" className="mb-3">
                  Could not save the charges.
                </Alert>
              )}
              <Button type="submit" size="sm" loading={saveConfig.isPending}>
                Save charges
              </Button>
            </div>
          </form>

          {configs.data && configs.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-muted-foreground)]">
                  <tr>
                    <th className="py-2">Type</th>
                    <th className="py-2">Base</th>
                    <th className="py-2">Water</th>
                    <th className="py-2">Parking</th>
                    <th className="py-2">Late fee</th>
                    <th className="py-2">Grace</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.data.map((config) => (
                    <tr key={config.id} className="border-t border-[var(--color-border)]">
                      <td className="py-2 font-medium">{config.flatType}</td>
                      <td className="py-2">{formatInr(config.baseInr)}</td>
                      <td className="py-2">{formatInr(config.waterInr)}</td>
                      <td className="py-2">{formatInr(config.parkingInr)}</td>
                      <td className="py-2">{formatInr(config.lateFeeInr)}</td>
                      <td className="py-2">{config.graceDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate */}
      <Card>
        <CardHeader>
          <CardTitle>Raise bills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              generate.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="gen-period">Period</Label>
              <Input
                id="gen-period"
                type="month"
                required
                value={generateForm.period}
                onChange={(event) => setGenerateForm({ ...generateForm, period: event.target.value })}
                className="w-44"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gen-due">Due date (optional)</Label>
              <Input
                id="gen-due"
                type="date"
                value={generateForm.dueDate}
                onChange={(event) => setGenerateForm({ ...generateForm, dueDate: event.target.value })}
                className="w-44"
              />
            </div>
            <Button type="submit" loading={generate.isPending}>
              Generate bills
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={overdue.isPending}
              onClick={() => overdue.mutate()}
            >
              Mark due bills overdue
            </Button>
          </form>
          {generate.data && (
            <Alert variant="success">
              {formatPeriod(generate.data.period)}: {generate.data.created} bills created,{" "}
              {generate.data.skipped} skipped.
            </Alert>
          )}
          {overdue.data && (
            <Alert variant="info">{overdue.data.updated} bills marked overdue.</Alert>
          )}
        </CardContent>
      </Card>

      {/* Manual payment */}
      {collect && (
        <Card>
          <CardHeader>
            <CardTitle>
              Record payment · Flat {collect.flat.code} · {formatPeriod(collect.period)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                manual.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="manual-amount">Amount (₹)</Label>
                <Input
                  id="manual-amount"
                  type="number"
                  min={1}
                  required
                  value={manualForm.amountInr}
                  onChange={(event) => setManualForm({ ...manualForm, amountInr: event.target.value })}
                  className="w-40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-provider">Method</Label>
                <Select
                  id="manual-provider"
                  value={manualForm.provider}
                  onChange={(event) =>
                    setManualForm({ ...manualForm, provider: event.target.value as "CASH" | "BANK_TRANSFER" | "UPI" })
                  }
                  className="w-44"
                >
                  {MANUAL_PROVIDERS.map((value) => (
                    <option key={value} value={value}>
                      {providerLabel(value)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-[14rem] flex-1 space-y-1.5">
                <Label htmlFor="manual-note">Note (optional)</Label>
                <Input
                  id="manual-note"
                  value={manualForm.note}
                  onChange={(event) => setManualForm({ ...manualForm, note: event.target.value })}
                />
              </div>
              <Button type="submit" loading={manual.isPending}>
                Record
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCollect(null)}>
                Cancel
              </Button>
            </form>
            {manual.isError && (
              <Alert variant="destructive" className="mt-3">
                {(manual.error as Error).message || "Could not record the payment."}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bills table */}
      <Card>
        <CardHeader>
          <CardTitle>Bills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-period">Period</Label>
              <Input
                id="filter-period"
                type="month"
                value={filters.period}
                onChange={(event) => setFilters({ ...filters, period: event.target.value })}
                className="w-44"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                id="filter-status"
                value={filters.status}
                onChange={(event) => setFilters({ ...filters, status: event.target.value as "" | BillStatus })}
                className="w-44"
              >
                <option value="">All</option>
                {BILL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {bills.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-5 w-5" />
            </div>
          ) : rows.length === 0 ? (
            <Alert>No bills match these filters.</Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-muted-foreground)]">
                  <tr>
                    <th className="py-2">Flat</th>
                    <th className="py-2">Period</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Due</th>
                    <th className="py-2">Status</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((bill) => (
                    <tr key={bill.id} className="border-t border-[var(--color-border)]">
                      <td className="py-2 font-medium">{bill.flat.code}</td>
                      <td className="py-2">{formatPeriod(bill.period)}</td>
                      <td className="py-2">{formatInr(bill.totalInr)}</td>
                      <td className="py-2">{formatDate(bill.dueDate)}</td>
                      <td className="py-2">
                        <BillStatusBadge status={bill.status} />
                      </td>
                      <td className="py-2 text-right">
                        {bill.status !== "PAID" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCollect(bill);
                              setManualForm({ amountInr: String(bill.totalInr), provider: "CASH", note: "" });
                            }}
                          >
                            Collect
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Recent payments</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-5 w-5" />
            </div>
          ) : (ledger.data?.data.length ?? 0) === 0 ? (
            <Alert>No payments recorded yet.</Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-muted-foreground)]">
                  <tr>
                    <th className="py-2">Flat</th>
                    <th className="py-2">Period</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Method</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Receipt</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.data?.data.map((payment) => (
                    <tr key={payment.id} className="border-t border-[var(--color-border)]">
                      <td className="py-2 font-medium">{payment.bill?.flat.code ?? "—"}</td>
                      <td className="py-2">{payment.bill ? formatPeriod(payment.bill.period) : "—"}</td>
                      <td className="py-2">{formatInr(payment.amountInr)}</td>
                      <td className="py-2">{providerLabel(payment.provider)}</td>
                      <td className="py-2">
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td className="py-2 text-[var(--color-muted-foreground)]">
                        {payment.receipt?.receiptNo ?? "—"}
                      </td>
                      <td className="py-2">{formatDate(payment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
