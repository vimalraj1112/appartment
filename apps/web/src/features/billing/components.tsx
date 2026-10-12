import type { BillStatus, PaymentProvider, PaymentStatus } from "@superlink/shared";
import { Badge } from "../../components/ui/badge";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const BILL_VARIANT: Record<BillStatus, Variant> = {
  PENDING: "warning",
  PARTIAL: "default",
  PAID: "success",
  OVERDUE: "destructive",
};

const PAYMENT_VARIANT: Record<PaymentStatus, Variant> = {
  PENDING: "muted",
  PROCESSING: "warning",
  SUCCESS: "success",
  FAILED: "destructive",
  REFUNDED: "muted",
};

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  MOCK: "Online",
  RAZORPAY: "Razorpay",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function BillStatusBadge({ status }: { status: BillStatus }) {
  return <Badge variant={BILL_VARIANT[status]}>{status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_VARIANT[status]}>{status}</Badge>;
}

export function providerLabel(provider: PaymentProvider): string {
  return PROVIDER_LABEL[provider];
}

export function formatInr(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  const index = Number(month) - 1;
  if (!year || Number.isNaN(index) || !MONTHS[index]) return period;
  return `${MONTHS[index]} ${year}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
