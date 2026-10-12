import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export function listNotifications(params: ListNotificationsParams = {}): Promise<Page<NotificationRecord>> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  if (params.unreadOnly) query.set("unreadOnly", "true");
  return apiRequestPage<NotificationRecord>(`/notifications?${query.toString()}`);
}

export function getUnreadCount(): Promise<{ count: number }> {
  return apiRequest<{ count: number }>("/notifications/unread-count");
}

export function markRead(id: string): Promise<{ id: string; read: boolean }> {
  return apiRequest<{ id: string; read: boolean }>(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllRead(): Promise<{ read: number }> {
  return apiRequest<{ read: number }>("/notifications/read-all", { method: "POST" });
}
