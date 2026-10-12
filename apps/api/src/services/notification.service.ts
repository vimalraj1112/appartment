import type { NotificationCreateInput, NotificationListQuery } from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import { currentAuth, runAsSystem } from "../tenant/context.js";
import { emitToUser } from "../realtime/socket.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { writeAudit } from "./audit.service.js";

export interface PublicNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
}

function toPublic(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
}): PublicNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export async function createNotification(input: NotificationCreateInput) {
  const target = await runAsSystem(() =>
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, communityId: true },
    }),
  );
  if (!target) throw AppError.notFound("We could not find that recipient.");

  const auth = currentAuth();
  if (auth && !auth.bypass && auth.communityId && target.communityId !== auth.communityId) {
    throw AppError.forbidden("That recipient is not in your community.");
  }

  const communityId = target.communityId ?? auth?.communityId ?? null;
  if (!communityId) {
    throw AppError.validation("We could not resolve the recipient's community.");
  }

  const created = await runAsSystem(() =>
    prisma.notification.create({
      data: {
        communityId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? undefined,
      },
    }),
  );

  emitToUser(input.userId, "notification:new", toPublic(created));
  return toPublic(created);
}

export async function listNotifications(userId: string, query: NotificationListQuery) {
  const { skip, take } = paginate(query.page, query.limit);
  const where = { userId, ...(query.unreadOnly ? { readAt: null } : {}) };

  const [total, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
  ]);

  return { items: rows.map(toPublic), meta: paginationMeta(query.page, query.limit, total) };
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, id: string) {
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
  if (result.count === 0) throw AppError.notFound("We could not find that notification.");
  return { id, read: true };
}

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { read: result.count };
}

export async function sendNotification(input: NotificationCreateInput) {
  const created = await createNotification(input);
  await writeAudit({
    action: "NOTIFICATION.SEND",
    resource: "Notification",
    resourceId: created.id,
    meta: { userId: input.userId, type: input.type },
  });
  return created;
}
