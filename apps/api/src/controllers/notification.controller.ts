import type { Request, Response } from "express";
import type { NotificationCreateInput, NotificationListQuery } from "@superlink/shared";
import { authContextOrThrow } from "../middleware/rbac.js";
import * as notifications from "../services/notification.service.js";
import { ok } from "../utils/respond.js";

export async function list(req: Request, res: Response): Promise<void> {
  const auth = authContextOrThrow();
  const query = req.validatedQuery as NotificationListQuery;
  const { items, meta } = await notifications.listNotifications(auth.userId, query);
  ok(res, items, meta);
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
  const auth = authContextOrThrow();
  ok(res, { count: await notifications.unreadCount(auth.userId) });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const auth = authContextOrThrow();
  ok(res, await notifications.markRead(auth.userId, req.params.id as string));
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const auth = authContextOrThrow();
  ok(res, await notifications.markAllRead(auth.userId));
}

export async function send(req: Request, res: Response): Promise<void> {
  ok(res, await notifications.sendNotification(req.body as NotificationCreateInput));
}
