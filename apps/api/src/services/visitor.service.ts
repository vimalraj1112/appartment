import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type {
  DeliveryCreateInput,
  DeliveryListQuery,
  DeliveryStatusUpdateInput,
  VisitorEntryCreateInput,
  VisitorEntryListQuery,
  VisitorPassCreateInput,
  VisitorPassDecisionInput,
  VisitorPassListQuery,
  VisitorVerifyInput,
  VisitorWalkInInput,
  WatchlistCreateInput,
  WatchlistListQuery,
} from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { runAsSystem, type AuthContext } from "../tenant/context.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";
import { createNotification } from "./notification.service.js";

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

const PASS_INCLUDE = {
  visitor: true,
  flat: {
    select: {
      id: true,
      code: true,
      floor: { select: { label: true, building: { select: { id: true, name: true } } } },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

type PassRow = Prisma.VisitorPassGetPayload<{ include: typeof PASS_INCLUDE }>;

function mapPass(pass: PassRow) {
  const expired = pass.validTo !== null && pass.validTo.getTime() < Date.now();
  return {
    id: pass.id,
    code: pass.code,
    type: pass.type,
    status: expired && pass.status === "ACTIVE" ? "EXPIRED" : pass.status,
    validFrom: pass.validFrom,
    validTo: pass.validTo,
    usedCount: pass.usedCount,
    maxUses: pass.maxUses,
    notes: pass.notes,
    decidedAt: pass.decidedAt,
    createdAt: pass.createdAt,
    visitor: pass.visitor,
    flat: pass.flat,
    createdBy: pass.createdBy,
    approvedBy: pass.approvedBy,
  };
}

function generateCode(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

function isManager(auth: AuthContext): boolean {
  return auth.role === "SUPER_ADMIN" || auth.role === "COMMUNITY_ADMIN" || auth.role === "SECURITY";
}

async function myFlatIds(userId: string): Promise<string[]> {
  const occupancies = await prisma.flatOccupant.findMany({
    where: { userId, movedOutAt: null },
    select: { flatId: true },
  });
  return occupancies.map((occupancy) => occupancy.flatId);
}

async function passWhereFor(auth: AuthContext): Promise<Prisma.VisitorPassWhereInput> {
  if (isManager(auth)) return {};
  return { flatId: { in: await myFlatIds(auth.userId) } };
}

async function findVisiblePass(id: string): Promise<PassRow> {
  const auth = authContextOrThrow();
  const scope = await passWhereFor(auth);
  const pass = await prisma.visitorPass.findFirst({ where: { id, ...scope }, include: PASS_INCLUDE });
  if (!pass) throw AppError.notFound("We could not find that pass.");
  return pass;
}

async function assertOwnFlat(flatId: string, auth: AuthContext): Promise<void> {
  if (isManager(auth)) return;
  const flats = await myFlatIds(auth.userId);
  if (!flats.includes(flatId)) {
    throw AppError.forbidden("You can only manage passes for your own flat.");
  }
}

async function resolveFlatForCreate(input: { flatId?: string }, auth: AuthContext): Promise<string> {
  if (isManager(auth)) {
    if (!input.flatId) throw AppError.validation("Please choose a flat.");
    const flat = await prisma.flat.findFirst({
      where: { id: input.flatId, deletedAt: null },
      select: { id: true },
    });
    if (!flat) throw AppError.notFound("We could not find that flat.");
    return input.flatId;
  }
  const flats = await myFlatIds(auth.userId);
  if (input.flatId) {
    if (!flats.includes(input.flatId)) {
      throw AppError.forbidden("You can only create passes for your own flat.");
    }
    return input.flatId;
  }
  const primary = flats[0];
  if (!primary) throw AppError.validation("No flat is linked to your account yet.");
  return primary;
}

async function createPassRow(
  data: Omit<Prisma.VisitorPassUncheckedCreateInput, "code">,
): Promise<PassRow> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    const clash = await prisma.visitorPass.findFirst({ where: { code }, select: { id: true } });
    if (clash) continue;
    return prisma.visitorPass.create({ data: { ...data, code }, include: PASS_INCLUDE });
  }
  throw AppError.conflict("We could not generate a unique pass code. Please try again.");
}

// ---------- Passes ----------

export async function listPasses(query: VisitorPassListQuery) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.VisitorPassWhereInput = { ...(await passWhereFor(auth)) };
  if (query.flatId) where.flatId = query.flatId;
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { code: { contains: query.q, mode: "insensitive" } },
      { visitor: { name: { contains: query.q, mode: "insensitive" } } },
      { visitor: { phone: { contains: query.q } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.visitorPass.count({ where }),
    prisma.visitorPass.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: PASS_INCLUDE }),
  ]);

  return { items: rows.map(mapPass), meta: paginationMeta(query.page, query.limit, total) };
}

export async function getPass(id: string) {
  return mapPass(await findVisiblePass(id));
}

export async function createPass(input: VisitorPassCreateInput) {
  const auth = authContextOrThrow();
  const flatId = await resolveFlatForCreate(input, auth);

  const visitor = await prisma.visitor.create({
    data: {
      communityId: "",
      flatId,
      name: input.visitorName,
      phone: input.visitorPhone ?? null,
      email: input.visitorEmail ?? null,
      purpose: input.purpose ?? null,
      createdById: auth.userId || null,
    },
  });

  const qrToken = randomBytes(24).toString("base64url");
  const pass = await createPassRow({
    communityId: "",
    visitorId: visitor.id,
    flatId,
    qrTokenHash: hashToken(qrToken),
    type: input.type,
    status: "ACTIVE",
    validFrom: input.validFrom ?? new Date(),
    validTo: input.validTo ?? null,
    maxUses: input.maxUses ?? (input.type === "SINGLE_USE" ? 1 : 10),
    notes: input.notes ?? null,
    createdById: auth.userId || null,
    approvedById: auth.userId || null,
    decidedAt: new Date(),
  });

  await writeAudit({
    action: "VISITOR.PASS_CREATE",
    resource: "VisitorPass",
    resourceId: pass.id,
    meta: { flatId, type: pass.type },
  });

  return { pass: mapPass(pass), qrToken, shareUrl: `${env.WEB_URL}/pass/${qrToken}` };
}

export async function cancelPass(id: string) {
  const auth = authContextOrThrow();
  const pass = await findVisiblePass(id);
  await assertOwnFlat(pass.flatId, auth);
  if (pass.status === "USED" || pass.status === "CANCELLED") {
    throw AppError.conflict("This pass can no longer be cancelled.");
  }

  const updated = await prisma.visitorPass.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: PASS_INCLUDE,
  });
  await writeAudit({ action: "VISITOR.PASS_CANCEL", resource: "VisitorPass", resourceId: id });
  return mapPass(updated);
}

export async function decidePass(id: string, input: VisitorPassDecisionInput) {
  const auth = authContextOrThrow();
  const pass = await findVisiblePass(id);
  await assertOwnFlat(pass.flatId, auth);
  if (pass.status !== "PENDING") {
    throw AppError.conflict("This visitor request has already been decided.");
  }

  const updated = await prisma.visitorPass.update({
    where: { id },
    data: {
      status: input.decision === "APPROVE" ? "ACTIVE" : "CANCELLED",
      approvedById: auth.userId || null,
      decidedAt: new Date(),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: PASS_INCLUDE,
  });
  await writeAudit({
    action: input.decision === "APPROVE" ? "VISITOR.PASS_APPROVE" : "VISITOR.PASS_REJECT",
    resource: "VisitorPass",
    resourceId: id,
  });
  return mapPass(updated);
}

export async function verifyPass(input: VisitorVerifyInput) {
  authContextOrThrow();
  const raw = input.code.trim();
  const pass = await prisma.visitorPass.findFirst({
    where: { OR: [{ code: raw.toUpperCase() }, { qrTokenHash: hashToken(raw) }] },
    include: PASS_INCLUDE,
  });
  if (!pass) throw AppError.notFound("No pass matches that code.");

  const visitor = pass.visitor;
  const watchlist = await prisma.watchlistEntry.findFirst({
    where: {
      active: true,
      OR: [
        { name: { equals: visitor.name, mode: "insensitive" } },
        ...(visitor.phone ? [{ value: visitor.phone }] : []),
      ],
    },
    select: { id: true, type: true, name: true, reason: true },
  });

  await writeAudit({
    action: "VISITOR.VERIFY",
    resource: "VisitorPass",
    resourceId: pass.id,
    meta: { matched: "code", watchlisted: Boolean(watchlist) },
  });

  return { pass: mapPass(pass), watchlisted: Boolean(watchlist), watchlist: watchlist ?? null };
}

// ---------- Entries ----------

export async function listEntries(query: VisitorEntryListQuery) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.VisitorEntryWhereInput = {};
  if (!isManager(auth)) where.visitor = { flatId: { in: await myFlatIds(auth.userId) } };
  if (query.flatId) where.visitor = { ...(where.visitor as object), flatId: query.flatId };
  if (query.direction) where.direction = query.direction;

  const [total, rows] = await Promise.all([
    prisma.visitorEntry.count({ where }),
    prisma.visitorEntry.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        visitor: { select: { id: true, name: true, phone: true, flatId: true } },
        pass: { select: { id: true, code: true } },
        guard: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  return { items: rows, meta: paginationMeta(query.page, query.limit, total) };
}

export async function registerEntry(input: VisitorEntryCreateInput) {
  const auth = authContextOrThrow();
  const visitor = await prisma.visitor.findFirst({
    where: { id: input.visitorId },
    select: { id: true },
  });
  if (!visitor) throw AppError.notFound("We could not find that visitor.");

  let pass: { id: string; type: string; status: string; usedCount: number; maxUses: number } | null = null;
  if (input.passId) {
    pass = await prisma.visitorPass.findFirst({
      where: { id: input.passId },
      select: { id: true, type: true, status: true, usedCount: true, maxUses: true },
    });
    if (!pass) throw AppError.notFound("We could not find that pass.");
  }

  const entry = await prisma.visitorEntry.create({
    data: {
      communityId: "",
      passId: input.passId ?? null,
      visitorId: input.visitorId,
      direction: input.direction,
      method: input.method,
      guardUserId: auth.userId || null,
      note: input.note ?? null,
    },
  });

  if (pass && input.direction === "IN" && pass.status === "ACTIVE") {
    const usedCount = pass.usedCount + 1;
    const status = pass.type === "SINGLE_USE" || usedCount >= pass.maxUses ? "USED" : "ACTIVE";
    await prisma.visitorPass.update({ where: { id: pass.id }, data: { usedCount, status } });
  }

  await writeAudit({
    action: "VISITOR.ENTRY",
    resource: "VisitorEntry",
    resourceId: entry.id,
    meta: { direction: input.direction, method: input.method },
  });

  return entry;
}

export async function walkIn(input: VisitorWalkInInput) {
  const auth = authContextOrThrow();
  const flat = await prisma.flat.findFirst({
    where: { id: input.flatId, deletedAt: null },
    select: { id: true, code: true },
  });
  if (!flat) throw AppError.notFound("We could not find that flat.");

  let visitor = input.phone
    ? await prisma.visitor.findFirst({ where: { phone: input.phone, flatId: input.flatId } })
    : null;
  if (!visitor) {
    visitor = await prisma.visitor.create({
      data: {
        communityId: "",
        flatId: input.flatId,
        name: input.name,
        phone: input.phone ?? null,
        purpose: input.purpose ?? null,
        createdById: auth.userId || null,
      },
    });
  }

  const qrToken = randomBytes(24).toString("base64url");
  const pass = await createPassRow({
    communityId: "",
    visitorId: visitor.id,
    flatId: input.flatId,
    qrTokenHash: hashToken(qrToken),
    type: "SINGLE_USE",
    status: "PENDING",
    maxUses: 1,
    notes: input.notes ?? null,
    createdById: auth.userId || null,
  });

  const occupants = await prisma.flatOccupant.findMany({
    where: { flatId: input.flatId, movedOutAt: null },
    select: { userId: true },
  });
  await Promise.all(
    occupants.map((occupant) =>
      createNotification({
        userId: occupant.userId,
        type: "VISITOR",
        title: "Visitor at the gate",
        body: `${input.name} is at the gate for flat ${flat.code}. Approve to let them in.`,
        data: { passId: pass.id },
      }),
    ),
  );

  await writeAudit({
    action: "VISITOR.WALK_IN",
    resource: "VisitorPass",
    resourceId: pass.id,
    meta: { flatId: input.flatId },
  });

  return { pass: mapPass(pass), qrToken, shareUrl: `${env.WEB_URL}/pass/${qrToken}` };
}

// ---------- Deliveries ----------

async function deliveryWhereFor(auth: AuthContext): Promise<Prisma.DeliveryWhereInput> {
  if (isManager(auth)) return {};
  return { flatId: { in: await myFlatIds(auth.userId) } };
}

export async function listDeliveries(query: DeliveryListQuery) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.DeliveryWhereInput = { ...(await deliveryWhereFor(auth)) };
  if (query.flatId) where.flatId = query.flatId;
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.q) {
    where.OR = [
      { company: { contains: query.q, mode: "insensitive" } },
      { personName: { contains: query.q, mode: "insensitive" } },
      { phone: { contains: query.q } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.delivery.count({ where }),
    prisma.delivery.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { flat: { select: { id: true, code: true } }, entries: { orderBy: { createdAt: "desc" }, take: 3 } },
    }),
  ]);

  return { items: rows, meta: paginationMeta(query.page, query.limit, total) };
}

export async function createDelivery(input: DeliveryCreateInput) {
  const auth = authContextOrThrow();
  if (!input.flatId) throw AppError.validation("Please choose a flat.");
  const flat = await prisma.flat.findFirst({ where: { id: input.flatId, deletedAt: null }, select: { id: true } });
  if (!flat) throw AppError.notFound("We could not find that flat.");

  const delivery = await prisma.delivery.create({
    data: {
      communityId: "",
      flatId: input.flatId,
      category: input.category,
      company: input.company ?? null,
      personName: input.personName ?? null,
      phone: input.phone ?? null,
      note: input.note ?? null,
      status: input.status ?? "EXPECTED",
      createdById: auth.userId || null,
    },
  });

  await writeAudit({
    action: "DELIVERY.CREATE",
    resource: "Delivery",
    resourceId: delivery.id,
    meta: { flatId: input.flatId, category: input.category },
  });

  return delivery;
}

export async function updateDeliveryStatus(id: string, input: DeliveryStatusUpdateInput) {
  const auth = authContextOrThrow();
  const delivery = await prisma.delivery.findFirst({ where: { id }, select: { id: true, flatId: true } });
  if (!delivery) throw AppError.notFound("We could not find that delivery.");

  const [updated] = await prisma.$transaction([
    prisma.delivery.update({ where: { id }, data: { status: input.status } }),
    prisma.deliveryEntry.create({
      data: {
        communityId: "",
        deliveryId: id,
        status: input.status,
        guardUserId: auth.userId || null,
        note: input.note ?? null,
      },
    }),
  ]);

  if (delivery.flatId && (input.status === "ARRIVED" || input.status === "DELIVERED")) {
    const occupants = await prisma.flatOccupant.findMany({
      where: { flatId: delivery.flatId, movedOutAt: null },
      select: { userId: true },
    });
    await Promise.all(
      occupants.map((occupant) =>
        createNotification({
          userId: occupant.userId,
          type: "VISITOR",
          title: input.status === "ARRIVED" ? "Delivery arrived" : "Delivery delivered",
          body: "A delivery for your flat has been updated at the gate.",
          data: { deliveryId: id, status: input.status },
        }),
      ),
    );
  }

  await writeAudit({
    action: "DELIVERY.STATUS",
    resource: "Delivery",
    resourceId: id,
    meta: { status: input.status },
  });

  return updated;
}

// ---------- Watchlist ----------

export async function listWatchlist(query: WatchlistListQuery) {
  authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.WatchlistEntryWhereInput = {};
  if (query.type) where.type = query.type;
  if (query.active !== undefined) where.active = query.active;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { value: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.watchlistEntry.count({ where }),
    prisma.watchlistEntry.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { flaggedBy: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  return { items: rows, meta: paginationMeta(query.page, query.limit, total) };
}

export async function createWatchlist(input: WatchlistCreateInput) {
  const auth = authContextOrThrow();
  const entry = await prisma.watchlistEntry.create({
    data: {
      communityId: "",
      type: input.type,
      name: input.name,
      value: input.value ?? null,
      reason: input.reason,
      flaggedById: auth.userId || null,
    },
  });
  await writeAudit({
    action: "WATCHLIST.CREATE",
    resource: "WatchlistEntry",
    resourceId: entry.id,
    meta: { type: input.type },
  });
  return entry;
}

export async function deactivateWatchlist(id: string) {
  authContextOrThrow();
  const entry = await prisma.watchlistEntry.findFirst({ where: { id }, select: { id: true } });
  if (!entry) throw AppError.notFound("We could not find that watchlist entry.");
  const updated = await prisma.watchlistEntry.update({ where: { id }, data: { active: false } });
  await writeAudit({ action: "WATCHLIST.DEACTIVATE", resource: "WatchlistEntry", resourceId: id });
  return updated;
}

// ---------- Public (shareable link) ----------

export async function listGateFlats() {
  authContextOrThrow();
  return prisma.flat.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
    take: 500,
    select: {
      id: true,
      code: true,
      floor: { select: { label: true, building: { select: { name: true } } } },
    },
  });
}

export async function getPublicPass(token: string) {
  const pass = await runAsSystem(() =>
    prisma.visitorPass.findFirst({
      where: { qrTokenHash: hashToken(token) },
      include: {
        visitor: true,
        flat: { select: { code: true } },
        community: { select: { name: true } },
      },
    }),
  );
  if (!pass) throw AppError.notFound("This pass is invalid or has expired.");
  const expired = pass.validTo !== null && pass.validTo.getTime() < Date.now();
  return {
    code: pass.code,
    status: expired && pass.status === "ACTIVE" ? "EXPIRED" : pass.status,
    type: pass.type,
    validFrom: pass.validFrom,
    validTo: pass.validTo,
    visitorName: pass.visitor.name,
    flatCode: pass.flat.code,
    communityName: pass.community?.name ?? "",
  };
}
