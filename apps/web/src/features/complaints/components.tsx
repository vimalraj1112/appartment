import type { ComplaintPriority, ComplaintStatus } from "@superlink/shared";
import { Badge } from "../../components/ui/badge";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const STATUS_VARIANT: Record<ComplaintStatus, Variant> = {
  OPEN: "warning",
  ASSIGNED: "default",
  IN_PROGRESS: "default",
  RESOLVED: "success",
  CLOSED: "muted",
};

const PRIORITY_VARIANT: Record<ComplaintPriority, Variant> = {
  LOW: "muted",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "destructive",
};

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status.replace("_", " ")}</Badge>;
}

export function ComplaintPriorityBadge({ priority }: { priority: ComplaintPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{priority}</Badge>;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
