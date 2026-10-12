import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { getUnreadCount } from "../../features/notifications/notification-api";
import { onNotification } from "../../features/realtime/socket";
import { Button } from "../ui/button";
import { Icon } from "../ui/icons";

function basePath(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/guard")) return "/guard";
  if (pathname.startsWith("/platform")) return "/platform";
  return "/app";
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  });

  useEffect(
    () =>
      onNotification(() => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }),
    [queryClient],
  );

  const count = data?.count ?? 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
      className="relative"
      onClick={() => navigate(`${basePath(location.pathname)}/notifications`)}
    >
      <Icon name="bell" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-[10px] font-semibold text-[var(--color-destructive-foreground)]">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Button>
  );
}
