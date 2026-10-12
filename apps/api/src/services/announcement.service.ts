import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { AuthContext } from "../tenant/context.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";
import { createNotification } from "./notification.service.js";

const ANNOUNCEMENT_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  _count: { select: { acks: true } },
} as const;

function isManager(auth: AuthContext): boolean {
  return auth.role === "SUPER_ADMIN" || auth.role === "COMMUNITY_ADMIN";
}

export async function listAnnouncements(query: {
  type?: "GENERAL" | "URGENT" | "MAINTENANCE" | "EVENT" | "EMERGENCY";
  status?: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  q?: string;
  page: number;
  limit: number;
}) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.AnnouncementWhereInput = {};
  if (isManager(auth)) {
    if (query.status) where.status = query.status;
  } else {
    where.status = "PUBLISHED";
    where.publishAt = { lte: new Date() };
  }
  if (query.type) where.type = query.type;
  if (query.q) where.title = { contains: query.q, mode: "insensitive" };

  const [total, items] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      skip,
      take,
      orderBy: [{ pinnedUntil: "desc" }, { publishAt: "desc" }],
      include: ANNOUNCEMENT_INCLUDE,
    }),
  ]);
  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function getAnnouncement(id: string) {
  const auth = authContextOrThrow();
  const announcement = await prisma.announcement.findFirst({
    where: { id, ...(isManager(auth) ? {} : { status: "PUBLISHED" as const, publishAt: { lte: new Date() } }) },
    include: ANNOUNCEMENT_INCLUDE,
  });
  if (!announcement) throw AppError.notFound("We could not find that announcement.");

  const myAck = await prisma.announcementAck.findFirst({
    where: { announcementId: id, userId: auth.userId },
  });

  let acks: Array<{ id: string; user: { id: string; firstName: string; lastName: string } }> = [];
  if (isManager(auth)) {
    acks = await prisma.announcementAck.findMany({
      where: { announcementId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  return { announcement, myAck: Boolean(myAck), ackCount: announcement._count.acks, acks };
}

export async function createAnnouncement(input: {
  type: "GENERAL" | "URGENT" | "MAINTENANCE" | "EVENT" | "EMERGENCY";
  title: string;
  body: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  publishAt?: Date;
  pinnedUntil?: Date;
}) {
  const auth = authContextOrThrow();
  const publishAt = input.publishAt ?? new Date();
  const announcement = await prisma.announcement.create({
    data: {
      communityId: "",
      authorId: auth.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      status: input.status,
      publishAt,
      pinnedUntil: input.pinnedUntil,
    },
    include: ANNOUNCEMENT_INCLUDE,
  });
  await writeAudit({ action: "ANNOUNCEMENT.CREATE", resource: "Announcement", resourceId: announcement.id });

  if (announcement.status === "PUBLISHED" && publishAt.getTime() <= Date.now()) {
    await notifyCommunity(announcement.id, announcement.title, announcement.type, auth.userId);
  }
  return announcement;
}

async function notifyCommunity(
  announcementId: string,
  title: string,
  type: "GENERAL" | "URGENT" | "MAINTENANCE" | "EVENT" | "EMERGENCY",
  authorId: string,
) {
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE", id: { not: authorId } },
    select: { id: true },
  });
  await Promise.all(
    users.map((user) =>
      createNotification({
        userId: user.id,
        type: type === "EMERGENCY" ? "EMERGENCY" : "ANNOUNCEMENT",
        title,
        body: "A new announcement was posted for your community.",
        data: { announcementId },
      }),
    ),
  );
}

export async function updateAnnouncement(
  id: string,
  input: Partial<{
    type: "GENERAL" | "URGENT" | "MAINTENANCE" | "EVENT" | "EMERGENCY";
    title: string;
    body: string;
    status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
    publishAt: Date;
    pinnedUntil: Date | null;
  }>,
) {
  const auth = authContextOrThrow();
  const existing = await prisma.announcement.findFirst({ where: { id } });
  if (!existing) throw AppError.notFound("We could not find that announcement.");

  const announcement = await prisma.announcement.update({
    where: { id },
    data: input,
    include: ANNOUNCEMENT_INCLUDE,
  });

  const justPublished =
    existing.status !== "PUBLISHED" &&
    announcement.status === "PUBLISHED" &&
    announcement.publishAt.getTime() <= Date.now();
  if (justPublished) {
    await notifyCommunity(announcement.id, announcement.title, announcement.type, auth.userId);
  }

  await writeAudit({ action: "ANNOUNCEMENT.UPDATE", resource: "Announcement", resourceId: id });
  return announcement;
}

export async function deleteAnnouncement(id: string) {
  const existing = await prisma.announcement.findFirst({ where: { id } });
  if (!existing) throw AppError.notFound("We could not find that announcement.");
  await prisma.announcement.delete({ where: { id } });
  await writeAudit({ action: "ANNOUNCEMENT.DELETE", resource: "Announcement", resourceId: id });
  return { id };
}

export async function acknowledgeAnnouncement(id: string) {
  const auth = authContextOrThrow();
  await findAccessiblePublishedOrThrow(id, auth);
  const ack = await prisma.announcementAck.upsert({
    where: { announcementId_userId: { announcementId: id, userId: auth.userId } },
    create: { communityId: "", announcementId: id, userId: auth.userId },
    update: {},
  });
  return { announcementId: id, acknowledgedAt: ack.createdAt };
}

async function findAccessiblePublishedOrThrow(id: string, auth: AuthContext) {
  const scoped = isManager(auth)
    ? { id }
    : { id, status: "PUBLISHED" as const, publishAt: { lte: new Date() } };
  const announcement = await prisma.announcement.findFirst({ where: scoped });
  if (!announcement) throw AppError.notFound("We could not find that announcement.");
  return announcement;
}
