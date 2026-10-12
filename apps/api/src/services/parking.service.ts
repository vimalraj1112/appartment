import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";

const SLOT_INCLUDE = {
  assignments: {
    where: { endsAt: null },
    orderBy: { createdAt: "desc" },
    take: 1,
    include: {
      flat: { select: { id: true, code: true } },
      vehicle: { select: { id: true, regNumber: true, type: true } },
    },
  },
} as const;

const ASSIGNMENT_INCLUDE = {
  slot: { select: { id: true, code: true, zone: true, status: true } },
  flat: { select: { id: true, code: true } },
  vehicle: { select: { id: true, regNumber: true, type: true } },
} as const;

// ---------- Slots ----------

export async function listSlots(query: {
  status?: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  zone?: string;
  q?: string;
  page: number;
  limit: number;
}) {
  authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.ParkingSlotWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.zone) where.zone = query.zone;
  if (query.q) where.code = { contains: query.q, mode: "insensitive" };

  const [total, items] = await Promise.all([
    prisma.parkingSlot.count({ where }),
    prisma.parkingSlot.findMany({ where, skip, take, orderBy: { code: "asc" }, include: SLOT_INCLUDE }),
  ]);
  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function createSlot(input: {
  code: string;
  zone?: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
}) {
  const slot = await prisma.parkingSlot.create({
    data: { communityId: "", code: input.code.trim().toUpperCase(), zone: input.zone, status: input.status },
    include: SLOT_INCLUDE,
  });
  await writeAudit({ action: "PARKING.SLOT_CREATE", resource: "ParkingSlot", resourceId: slot.id });
  return slot;
}

export async function updateSlot(
  id: string,
  input: Partial<{ code: string; zone: string | null; status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE" }>,
) {
  const existing = await prisma.parkingSlot.findFirst({ where: { id } });
  if (!existing) throw AppError.notFound("We could not find that parking slot.");
  const data: Prisma.ParkingSlotUpdateInput = { ...input };
  if (typeof input.code === "string") data.code = input.code.trim().toUpperCase();
  const slot = await prisma.parkingSlot.update({ where: { id }, data, include: SLOT_INCLUDE });
  await writeAudit({ action: "PARKING.SLOT_UPDATE", resource: "ParkingSlot", resourceId: id });
  return slot;
}

export async function deleteSlot(id: string) {
  const existing = await prisma.parkingSlot.findFirst({ where: { id } });
  if (!existing) throw AppError.notFound("We could not find that parking slot.");
  const active = await prisma.parkingAssignment.count({ where: { slotId: id, endsAt: null } });
  if (active > 0) throw AppError.conflict("Release the active assignment before removing this slot.");
  await prisma.parkingSlot.delete({ where: { id } });
  await writeAudit({ action: "PARKING.SLOT_DELETE", resource: "ParkingSlot", resourceId: id });
  return { id };
}

// ---------- Assignments ----------

export async function listAssignments(query: {
  slotId?: string;
  flatId?: string;
  active?: boolean;
  page: number;
  limit: number;
}) {
  authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.ParkingAssignmentWhereInput = {};
  if (query.slotId) where.slotId = query.slotId;
  if (query.flatId) where.flatId = query.flatId;
  if (query.active) where.endsAt = null;

  const [total, items] = await Promise.all([
    prisma.parkingAssignment.count({ where }),
    prisma.parkingAssignment.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: ASSIGNMENT_INCLUDE,
    }),
  ]);
  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function assignSlot(input: {
  slotId: string;
  flatId?: string;
  vehicleId?: string;
  startsAt?: Date;
  endsAt?: Date;
}) {
  const slot = await prisma.parkingSlot.findFirst({ where: { id: input.slotId } });
  if (!slot) throw AppError.notFound("We could not find that parking slot.");

  const active = await prisma.parkingAssignment.findFirst({ where: { slotId: slot.id, endsAt: null } });
  if (active) throw AppError.conflict("This slot is already assigned.");

  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: input.vehicleId } });
    if (!vehicle) throw AppError.notFound("We could not find that vehicle.");
  }

  const assignment = await prisma.parkingAssignment.create({
    data: {
      communityId: "",
      slotId: slot.id,
      flatId: input.flatId ?? null,
      vehicleId: input.vehicleId ?? null,
      startsAt: input.startsAt ?? new Date(),
      endsAt: input.endsAt ?? null,
    },
    include: ASSIGNMENT_INCLUDE,
  });
  await prisma.parkingSlot.update({ where: { id: slot.id }, data: { status: "OCCUPIED" } });
  await writeAudit({ action: "PARKING.ASSIGN", resource: "ParkingAssignment", resourceId: assignment.id });
  return assignment;
}

export async function endAssignment(id: string, endsAt?: Date) {
  const assignment = await prisma.parkingAssignment.findFirst({ where: { id } });
  if (!assignment) throw AppError.notFound("We could not find that assignment.");
  if (assignment.endsAt) throw AppError.conflict("This assignment has already ended.");

  const updated = await prisma.parkingAssignment.update({
    where: { id },
    data: { endsAt: endsAt ?? new Date() },
    include: ASSIGNMENT_INCLUDE,
  });
  const remaining = await prisma.parkingAssignment.count({
    where: { slotId: assignment.slotId, endsAt: null },
  });
  if (remaining === 0) {
    const slot = await prisma.parkingSlot.findFirst({ where: { id: assignment.slotId } });
    if (slot && slot.status === "OCCUPIED") {
      await prisma.parkingSlot.update({ where: { id: slot.id }, data: { status: "AVAILABLE" } });
    }
  }
  await writeAudit({ action: "PARKING.RELEASE", resource: "ParkingAssignment", resourceId: id });
  return updated;
}

// ---------- Visitor parking ----------

export async function listVisitorParking(query: { active?: boolean; page: number; limit: number }) {
  authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.ParkingVisitorWhereInput = {};
  if (query.active) {
    where.OR = [{ validTo: null }, { validTo: { gt: new Date() } }];
  }
  const [total, items] = await Promise.all([
    prisma.parkingVisitor.count({ where }),
    prisma.parkingVisitor.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        slot: { select: { id: true, code: true, zone: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function createVisitorParking(input: {
  regNumber: string;
  name?: string;
  phone?: string;
  slotId?: string;
  validFrom?: Date;
  validTo?: Date;
  note?: string;
}) {
  const auth = authContextOrThrow();
  if (input.slotId) {
    const slot = await prisma.parkingSlot.findFirst({ where: { id: input.slotId } });
    if (!slot) throw AppError.notFound("We could not find that parking slot.");
  }
  const visitor = await prisma.parkingVisitor.create({
    data: {
      communityId: "",
      slotId: input.slotId ?? null,
      regNumber: input.regNumber.trim().toUpperCase().replace(/\s+/g, ""),
      name: input.name,
      phone: input.phone,
      note: input.note,
      validFrom: input.validFrom ?? new Date(),
      validTo: input.validTo,
      createdById: auth.userId,
    },
    include: { slot: { select: { id: true, code: true, zone: true } } },
  });
  await writeAudit({ action: "PARKING.VISITOR_CREATE", resource: "ParkingVisitor", resourceId: visitor.id });
  return visitor;
}
