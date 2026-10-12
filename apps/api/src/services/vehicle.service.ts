import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { AuthContext } from "../tenant/context.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";

const VEHICLE_INCLUDE = {
  flat: { select: { id: true, code: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
} as const;

function isAdmin(auth: AuthContext): boolean {
  return auth.role === "SUPER_ADMIN" || auth.role === "COMMUNITY_ADMIN";
}

function seesAll(auth: AuthContext): boolean {
  return isAdmin(auth) || auth.role === "SECURITY";
}

async function myFlatIds(userId: string): Promise<string[]> {
  const occupancies = await prisma.flatOccupant.findMany({
    where: { userId, movedOutAt: null },
    select: { flatId: true },
  });
  return occupancies.map((occupancy) => occupancy.flatId);
}

function normalizeReg(reg: string): string {
  return reg.trim().toUpperCase().replace(/\s+/g, "");
}

function uniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

export async function listVehicles(query: {
  type?: "CAR" | "BIKE" | "EV" | "BICYCLE";
  flatId?: string;
  q?: string;
  mine?: boolean;
  guestsOnly?: boolean;
  page: number;
  limit: number;
}) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.VehicleWhereInput = {};
  if (!seesAll(auth)) {
    const flats = await myFlatIds(auth.userId);
    where.OR = [{ userId: auth.userId }, { flatId: { in: flats } }];
  }
  if (query.type) where.type = query.type;
  if (query.flatId) where.flatId = query.flatId;
  if (query.mine) where.userId = auth.userId;
  if (query.guestsOnly) where.isGuest = true;
  if (query.q) {
    where.regNumber = { contains: normalizeReg(query.q), mode: "insensitive" };
  }

  const [total, items] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: VEHICLE_INCLUDE }),
  ]);
  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function getVehicle(id: string) {
  const auth = authContextOrThrow();
  const where: Prisma.VehicleWhereInput = { id };
  if (!seesAll(auth)) {
    const flats = await myFlatIds(auth.userId);
    where.OR = [{ userId: auth.userId }, { flatId: { in: flats } }];
  }
  const vehicle = await prisma.vehicle.findFirst({ where, include: VEHICLE_INCLUDE });
  if (!vehicle) throw AppError.notFound("We could not find that vehicle.");
  return vehicle;
}

export async function createVehicle(input: {
  regNumber: string;
  type: "CAR" | "BIKE" | "EV" | "BICYCLE";
  brand?: string;
  model?: string;
  color?: string;
  flatId?: string;
  isGuest: boolean;
  guestExpiresAt?: Date;
}) {
  const auth = authContextOrThrow();

  let flatId = input.flatId;
  if (!isAdmin(auth)) {
    const owned = await myFlatIds(auth.userId);
    if (owned.length === 0) throw AppError.validation("You are not an occupant of any flat.");
    if (flatId && !owned.includes(flatId)) throw AppError.forbidden();
    flatId = flatId ?? owned[0];
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        communityId: "",
        userId: auth.userId,
        flatId: flatId ?? null,
        regNumber: normalizeReg(input.regNumber),
        type: input.type,
        brand: input.brand,
        model: input.model,
        color: input.color,
        isGuest: input.isGuest,
        guestExpiresAt: input.guestExpiresAt,
      },
      include: VEHICLE_INCLUDE,
    });
    await writeAudit({ action: "VEHICLE.CREATE", resource: "Vehicle", resourceId: vehicle.id });
    return vehicle;
  } catch (error) {
    if (uniqueViolation(error)) throw AppError.conflict("A vehicle with that registration number already exists.");
    throw error;
  }
}

export async function updateVehicle(
  id: string,
  input: Partial<{
    regNumber: string;
    type: "CAR" | "BIKE" | "EV" | "BICYCLE";
    brand: string | null;
    model: string | null;
    color: string | null;
    flatId: string | null;
    isGuest: boolean;
    guestExpiresAt: Date | null;
  }>,
) {
  const existing = await getVehicle(id);
  const auth = authContextOrThrow();
  if (!isAdmin(auth) && existing.userId !== auth.userId) throw AppError.forbidden();

  const data: Prisma.VehicleUpdateInput = { ...input };
  if (typeof input.regNumber === "string") data.regNumber = normalizeReg(input.regNumber);

  try {
    const vehicle = await prisma.vehicle.update({ where: { id }, data, include: VEHICLE_INCLUDE });
    await writeAudit({ action: "VEHICLE.UPDATE", resource: "Vehicle", resourceId: id });
    return vehicle;
  } catch (error) {
    if (uniqueViolation(error)) throw AppError.conflict("A vehicle with that registration number already exists.");
    throw error;
  }
}

export async function deleteVehicle(id: string) {
  const existing = await getVehicle(id);
  const auth = authContextOrThrow();
  if (!isAdmin(auth) && existing.userId !== auth.userId) throw AppError.forbidden();
  await prisma.vehicle.delete({ where: { id } });
  await writeAudit({ action: "VEHICLE.DELETE", resource: "Vehicle", resourceId: id });
  return { id };
}
