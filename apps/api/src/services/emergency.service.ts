import type { EmergencyAlertStatus, EmergencyCategory } from "@superlink/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { AuthContext } from "../tenant/context.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";
import { createNotification } from "./notification.service.js";
import { emitToCommunity } from "../realtime/socket.js";

const ALERT_INCLUDE = {
  flat: { select: { id: true, code: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
  acknowledgedBy: { select: { id: true, firstName: true, lastName: true } },
  resolvedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

const ACTIVE: EmergencyAlertStatus[] = ["TRIGGERED", "ACKNOWLEDGED"];

function isResponder(auth: AuthContext): boolean {
  return auth.role === "SUPER_ADMIN" || auth.role === "COMMUNITY_ADMIN" || auth.role === "SECURITY";
}

async function myFlatIds(userId: string): Promise<string[]> {
  const occupancies = await prisma.flatOccupant.findMany({
    where: { userId, movedOutAt: null },
    select: { flatId: true },
  });
  return occupancies.map((occupancy) => occupancy.flatId);
}

function alertLabel(category: EmergencyCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function broadcast(alert: { id: string; category: string; status: string; flatId: string | null; flat: { code: string } | null }) {
  const communityId = authContextOrThrow().communityId;
  if (!communityId) return;
  emitToCommunity(communityId, "emergency:alert", {
    id: alert.id,
    category: alert.category,
    status: alert.status,
    flatId: alert.flatId,
    flatCode: alert.flat?.code ?? null,
    at: new Date().toISOString(),
  });
}

async function notifyResponders(
  alert: { id: string; category: EmergencyCategory; flat: { code: string } | null },
  excludeUserId: string,
) {
  const responders = await prisma.user.findMany({
    where: { status: "ACTIVE", role: { in: ["COMMUNITY_ADMIN", "SECURITY"] }, id: { not: excludeUserId } },
    select: { id: true },
  });
  await Promise.all(
    responders.map((responder) =>
      createNotification({
        userId: responder.id,
        type: "EMERGENCY",
        title: `${alertLabel(alert.category)} emergency triggered`,
        body: alert.flat ? `Alert raised for flat ${alert.flat.code}.` : "An emergency alert was raised.",
        data: { emergencyAlertId: alert.id, category: alert.category },
      }),
    ),
  );
}

export async function listAlerts(query: {
  status?: EmergencyAlertStatus;
  category?: EmergencyCategory;
  flatId?: string;
  mine?: boolean;
  page: number;
  limit: number;
}) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.EmergencyAlertWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.flatId) where.flatId = query.flatId;
  if (query.mine) where.userId = auth.userId;

  if (!isResponder(auth)) {
    const flats = await myFlatIds(auth.userId);
    where.OR = [{ flatId: { in: flats } }, { userId: auth.userId }];
  }

  const [total, items] = await Promise.all([
    prisma.emergencyAlert.count({ where }),
    prisma.emergencyAlert.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: ALERT_INCLUDE }),
  ]);
  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function getAlert(id: string) {
  const auth = authContextOrThrow();
  const alert = await prisma.emergencyAlert.findFirst({ where: { id }, include: ALERT_INCLUDE });
  if (!alert) throw AppError.notFound("We could not find that alert.");
  if (!isResponder(auth)) {
    const flats = await myFlatIds(auth.userId);
    const visible = alert.userId === auth.userId || (alert.flatId && flats.includes(alert.flatId));
    if (!visible) throw AppError.notFound("We could not find that alert.");
  }
  return alert;
}

export async function triggerAlert(input: { category: EmergencyCategory; note?: string; flatId?: string }) {
  const auth = authContextOrThrow();

  let flatId = input.flatId ?? null;
  if (auth.role === "RESIDENT") {
    const owned = await myFlatIds(auth.userId);
    if (owned.length === 0) throw AppError.validation("You are not an occupant of any flat.");
    if (input.flatId && !owned.includes(input.flatId)) throw AppError.forbidden();
    flatId = input.flatId ?? owned[0] ?? null;
  } else if (input.flatId) {
    const flat = await prisma.flat.findFirst({ where: { id: input.flatId } });
    if (!flat) throw AppError.notFound("We could not find that flat.");
  }

  const active = await prisma.emergencyAlert.findFirst({
    where: { userId: auth.userId, status: { in: ACTIVE } },
  });
  if (active) throw AppError.conflict("You already have an active emergency alert.");

  const recent = await prisma.emergencyAlert.count({
    where: { userId: auth.userId, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recent >= 5) throw new AppError("RATE_LIMITED", "Too many alerts raised. Please wait before raising another.");

  const alert = await prisma.emergencyAlert.create({
    data: {
      communityId: "",
      userId: auth.userId,
      flatId,
      category: input.category,
      note: input.note,
      status: "TRIGGERED",
    },
    include: ALERT_INCLUDE,
  });

  await writeAudit({
    action: "EMERGENCY.TRIGGER",
    resource: "EmergencyAlert",
    resourceId: alert.id,
    meta: { category: alert.category, flatId },
  });
  await notifyResponders(alert, auth.userId);
  broadcast(alert);
  return alert;
}

export async function acknowledgeAlert(id: string, note?: string) {
  const auth = authContextOrThrow();
  const alert = await prisma.emergencyAlert.findFirst({ where: { id } });
  if (!alert) throw AppError.notFound("We could not find that alert.");
  if (alert.status !== "TRIGGERED") throw AppError.conflict("This alert has already been acknowledged.");

  const updated = await prisma.emergencyAlert.update({
    where: { id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedById: auth.userId,
      acknowledgedAt: new Date(),
      note: note ?? alert.note,
    },
    include: ALERT_INCLUDE,
  });
  await writeAudit({ action: "EMERGENCY.ACKNOWLEDGE", resource: "EmergencyAlert", resourceId: id });
  if (alert.userId !== auth.userId) {
    await createNotification({
      userId: alert.userId,
      type: "EMERGENCY",
      title: "Your emergency alert was acknowledged",
      body: "A responder is on the way.",
      data: { emergencyAlertId: id },
    });
  }
  broadcast(updated);
  return updated;
}

export async function resolveAlert(id: string, note?: string) {
  const auth = authContextOrThrow();
  const alert = await prisma.emergencyAlert.findFirst({ where: { id } });
  if (!alert) throw AppError.notFound("We could not find that alert.");
  if (alert.status === "RESOLVED") throw AppError.conflict("This alert is already resolved.");

  const updated = await prisma.emergencyAlert.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedById: auth.userId,
      resolvedAt: new Date(),
      note: note ?? alert.note,
    },
    include: ALERT_INCLUDE,
  });
  await writeAudit({ action: "EMERGENCY.RESOLVE", resource: "EmergencyAlert", resourceId: id });
  if (alert.userId !== auth.userId) {
    await createNotification({
      userId: alert.userId,
      type: "EMERGENCY",
      title: "Your emergency alert was resolved",
      body: "The situation has been marked resolved.",
      data: { emergencyAlertId: id },
    });
  }
  broadcast(updated);
  return updated;
}
