import type { DeliveryStatus, VisitorPassStatus } from "@superlink/shared";
import { Badge } from "../../components/ui/badge";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const PASS_VARIANT: Record<VisitorPassStatus, Variant> = {
  PENDING: "warning",
  ACTIVE: "success",
  USED: "muted",
  EXPIRED: "muted",
  CANCELLED: "destructive",
};

const DELIVERY_VARIANT: Record<DeliveryStatus, Variant> = {
  EXPECTED: "muted",
  ARRIVED: "warning",
  DELIVERED: "success",
  COLLECTED: "default",
  CANCELLED: "destructive",
};

export function PassStatusBadge({ status }: { status: VisitorPassStatus }) {
  return <Badge variant={PASS_VARIANT[status]}>{status}</Badge>;
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <Badge variant={DELIVERY_VARIANT[status]}>{status}</Badge>;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
