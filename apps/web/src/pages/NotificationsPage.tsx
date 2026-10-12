import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationRecord } from "../features/notifications/notification-api";
import {
  listNotifications,
  markAllRead,
  markRead,
} from "../features/notifications/notification-api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Spinner } from "../components/ui/spinner";

const TYPE_VARIANT: Record<string, "default" | "success" | "warning" | "destructive" | "muted"> = {
  EMERGENCY: "destructive",
  BILLING: "warning",
  COMPLAINT: "warning",
  ANNOUNCEMENT: "success",
  VISITOR: "default",
  SYSTEM: "muted",
  GENERAL: "muted",
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list", unreadOnly],
    queryFn: () => listNotifications({ unreadOnly, limit: 50 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const readOne = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: invalidate,
  });
  const readAll = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: invalidate,
  });

  const items: NotificationRecord[] = data?.data ?? [];
  const hasUnread = items.some((item) => !item.readAt);

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle="Updates from your community." />

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={unreadOnly ? "primary" : "outline"}
            size="sm"
            onClick={() => setUnreadOnly((value) => !value)}
          >
            Unread only
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          loading={readAll.isPending}
          disabled={!hasUnread}
          onClick={() => readAll.mutate()}
        >
          Mark all as read
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-muted-foreground)]">
            {unreadOnly ? "No unread notifications." : "You have no notifications yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={item.readAt ? "opacity-70" : "border-[var(--color-primary)]/30"}
            >
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={TYPE_VARIANT[item.type] ?? "muted"}>{item.type}</Badge>
                    <p className="truncate font-medium">{item.title}</p>
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{item.body}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                {!item.readAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={readOne.isPending && readOne.variables === item.id}
                    onClick={() => readOne.mutate(item.id)}
                  >
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
