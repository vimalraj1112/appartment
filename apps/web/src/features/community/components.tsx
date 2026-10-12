import type { AnnouncementStatus, AnnouncementType, PostReportStatus, PostStatus } from "@superlink/shared";
import { Badge } from "../../components/ui/badge";

type Variant = "default" | "success" | "warning" | "destructive" | "muted";

const ANNOUNCEMENT_TYPE_VARIANT: Record<AnnouncementType, Variant> = {
  GENERAL: "default",
  URGENT: "destructive",
  MAINTENANCE: "warning",
  EVENT: "success",
  EMERGENCY: "destructive",
};

const ANNOUNCEMENT_STATUS_VARIANT: Record<AnnouncementStatus, Variant> = {
  DRAFT: "muted",
  SCHEDULED: "warning",
  PUBLISHED: "success",
  ARCHIVED: "muted",
};

const POST_STATUS_VARIANT: Record<PostStatus, Variant> = {
  VISIBLE: "success",
  HIDDEN: "warning",
  REMOVED: "destructive",
};

const REPORT_STATUS_VARIANT: Record<PostReportStatus, Variant> = {
  OPEN: "warning",
  RESOLVED: "success",
  DISMISSED: "muted",
};

export const REACTION_EMOJIS = ["👍", "❤️", "🎉", "😂", "🙏"] as const;

export function AnnouncementTypeBadge({ type }: { type: AnnouncementType }) {
  return <Badge variant={ANNOUNCEMENT_TYPE_VARIANT[type]}>{type}</Badge>;
}

export function AnnouncementStatusBadge({ status }: { status: AnnouncementStatus }) {
  return <Badge variant={ANNOUNCEMENT_STATUS_VARIANT[status]}>{status}</Badge>;
}

export function PostStatusBadge({ status }: { status: PostStatus }) {
  return <Badge variant={POST_STATUS_VARIANT[status]}>{status}</Badge>;
}

export function ReportStatusBadge({ status }: { status: PostReportStatus }) {
  return <Badge variant={REPORT_STATUS_VARIANT[status]}>{status}</Badge>;
}

export function authorName(author: { firstName: string; lastName: string }): string {
  return `${author.firstName} ${author.lastName}`.trim();
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

export function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}
