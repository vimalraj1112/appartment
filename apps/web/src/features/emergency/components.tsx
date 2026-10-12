import type { EmergencyAlertStatus, EmergencyCategory } from "@superlink/shared";
import { Badge } from "../../components/ui/badge";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const CATEGORY_VARIANT: Record<EmergencyCategory, Variant> = {
  MEDICAL: "destructive",
  FIRE: "destructive",
  SECURITY: "destructive",
  ELECTRICAL: "warning",
  WATER: "warning",
  OTHER: "default",
};

const STATUS_VARIANT: Record<EmergencyAlertStatus, Variant> = {
  TRIGGERED: "destructive",
  ACKNOWLEDGED: "warning",
  RESOLVED: "success",
};

export const EMERGENCY_CATEGORY_OPTIONS: Array<{ value: EmergencyCategory; label: string }> = [
  { value: "MEDICAL", label: "Medical" },
  { value: "FIRE", label: "Fire" },
  { name: "SECURITY", label: "Security" } as never,
];

export function EmergencyCategoryBadge({ category }: { category: EmergencyCategory }) {
  const label = category.charAt(0) + category.slice(1).toLowerCase();
  return <Badge variant={CATEGORY_VARIANT[category]}>{label}</Badge>;
}

export function EmergencyStatusBadge({ status }: { status: EmergencyAlertStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

export function personName(person: { firstName: string; lastName: string } | null): string {
  if (!person) return "—";
  return `${person.firstName} ${person.lastName}`.trim();
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
