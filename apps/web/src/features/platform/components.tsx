import { Badge } from "../../components/ui/badge";
import type { CommunityStatus, SubscriptionStatus } from "./platform-api";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const COMMUNITY_VARIANT: Record<CommunityStatus, Variant> = {
  ACTIVE: "success",
  SUSPENDED: "destructive",
};

const SUBSCRIPTION_VARIANT: Record<SubscriptionStatus, Variant> = {
  ACTIVE: "success",
  TRIAL: "default",
  PAST_DUE: "warning",
  CANCELLED: "muted",
};

export function CommunityStatusBadge({ status }: { status: CommunityStatus }) {
  return <Badge variant={COMMUNITY_VARIANT[status]}>{status === "ACTIVE" ? "Active" : "Suspended"}</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={SUBSCRIPTION_VARIANT[status]}>{status.replace("_", " ")}</Badge>;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatInr(value: number): string {
  return inr.format(value);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
