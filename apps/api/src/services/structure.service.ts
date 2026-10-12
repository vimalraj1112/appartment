import type {
  BuildingCreateInput,
  BuildingUpdateInput,
  FlatBulkCreateInput,
  FlatCreateInput,
  FlatListQuery,
  FlatUpdateInput,
  FloorCreateInput,
  FloorUpdateInput,
} from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { writeAudit } from "./audit.service.js";

// ---------- Buildings ----------

export async function listBuildings() {
  const buildings = await prisma.building.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      floors: { where: {}, orderBy: { number: "asc" }, include: { _count: { select: { flats: true } } } },
      _count: { select: { floors: true } },
    },
  });

  return buildings.map((building) => ({
    id: building.id,
    name: building.name,
    towerCode: building.towerCode,
    floorsCount: building.floorsCount,
    floorCount: building._count.floors,
    flatCount: building.floors.reduce((sum, floor) => sum + floor._count.flats, 0),
    createdAt: building.createdAt,
  }));
}

export async function getBuilding(id: string) {
  const building = await prisma.building.findFirst({
    where: { id, deletedAt: null },
    include: {
      floors: {
        orderBy: { number: "asc" },
        include: { _count: { select: { flats: true } } },
      },
    },
  });
  if (!building) throw AppError.notFound("We could not find that building.");

  return {
    id: building.id,
    name: building.name,
    towerCode: building.towerCode,
    floorsCount: building.floorsCount,
    floors: building.floors.map((floor) => ({
      id: floor.id,
      number: floor.number,
      label: floor.label,
      flatCount: floor._count.flats,
    })),
  };
}

export async function createBuilding(input: BuildingCreateInput) {
  const building = await prisma.building.create({
    data: {
      communityId: "",
      name: input.name,
      towerCode: input.towerCode ?? null,
      floorsCount: input.floorsCount,
    },
  });
  await writeAudit({
    action: "STRUCTURE.BUILDING_CREATE",
    resource: "Building",
    resourceId: building.id,
    meta: { name: building.name },
  });
  return building;
}

export async function updateBuilding(id: string, input: BuildingUpdateInput) {
  const existing = await prisma.building.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw AppError.notFound("We could not find that building.");

  return prisma.building.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.towerCode !== undefined ? { towerCode: input.towerCode } : {}),
      ...(input.floorsCount !== undefined ? { floorsCount: input.floorsCount } : {}),
    },
  });
}

export async function deleteBuilding(id: string) {
  const existing = await prisma.building.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw AppError.notFound("We could not find that building.");

  await prisma.building.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({
    action: "STRUCTURE.BUILDING_DELETE",
    resource: "Building",
    resourceId: id,
  });
}

// ---------- Floors ----------

export async function listFloors(buildingId: string) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, deletedAt: null },
    select: { id: true },
  });
  if (!building) throw AppError.notFound("We could not find that building.");

  return prisma.floor.findMany({
    where: { buildingId },
    orderBy: { number: "asc" },
    include: { _count: { select: { flats: true } } },
  });
}

export async function createFloor(buildingId: string, input: FloorCreateInput) {
  const building = await prisma.building.findFirst({
    where: { id: buildingId, deletedAt: null },
    select: { id: true, floorsCount: true },
  });
  if (!building) throw AppError.notFound("We could not find that building.");

  const floor = await prisma.floor.create({
    data: { communityId: "", buildingId, number: input.number, label: input.label },
  });

  if (input.number > building.floorsCount) {
    await prisma.building.update({
      where: { id: buildingId },
      data: { floorsCount: input.number },
    });
  }

  await writeAudit({
    action: "STRUCTURE.FLOOR_CREATE",
    resource: "Floor",
    resourceId: floor.id,
    meta: { buildingId, number: floor.number },
  });
  return floor;
}

export async function updateFloor(id: string, input: FloorUpdateInput) {
  const existing = await prisma.floor.findFirst({ where: { id } });
  if (!existing) throw AppError.notFound("We could not find that floor.");

  return prisma.floor.update({
    where: { id },
    data: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.number !== undefined ? { number: input.number } : {}),
    },
  });
}

export async function deleteFloor(id: string) {
  const existing = await prisma.floor.findFirst({
    where: { id },
    include: { _count: { select: { flats: true } } },
  });
  if (!existing) throw AppError.notFound("We could not find that floor.");

  if (existing._count.flats > 0) {
    throw AppError.conflict("Move or remove this floor's flats before deleting it.");
  }

  await prisma.floor.delete({ where: { id } });
  await writeAudit({ action: "STRUCTURE.FLOOR_DELETE", resource: "Floor", resourceId: id });
}

// ---------- Flats ----------

export async function listFlats(query: FlatListQuery) {
  const { skip, take } = paginate(query.page, query.limit);

  const where = {
    deletedAt: null,
    ...(query.floorId ? { floorId: query.floorId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { code: { contains: query.q, mode: "insensitive" as const } } : {}),
    ...(query.buildingId ? { floor: { buildingId: query.buildingId } } : {}),
  };

  const [total, flats] = await Promise.all([
    prisma.flat.count({ where }),
    prisma.flat.findMany({
      where,
      skip,
      take,
      orderBy: { code: "asc" },
      include: {
        floor: { select: { id: true, number: true, label: true, buildingId: true } },
        occupants: {
          where: { movedOutAt: null },
          select: {
            id: true,
            relation: true,
            isPrimary: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    }),
  ]);

  return { items: flats, meta: paginationMeta(query.page, query.limit, total) };
}

export async function getFlat(id: string) {
  const flat = await prisma.flat.findFirst({
    where: { id, deletedAt: null },
    include: {
      floor: { include: { building: { select: { id: true, name: true, towerCode: true } } } },
      occupants: {
        where: { movedOutAt: null },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
            },
          },
        },
      },
      familyMembers: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!flat) throw AppError.notFound("We could not find that flat.");
  return flat;
}

async function assertFloor(floorId: string) {
  const floor = await prisma.floor.findFirst({ where: { id: floorId }, select: { id: true } });
  if (!floor) throw AppError.notFound("We could not find that floor.");
  return floor;
}

export async function createFlat(input: FlatCreateInput) {
  await assertFloor(input.floorId);
  const flat = await prisma.flat.create({
    data: {
      communityId: "",
      floorId: input.floorId,
      code: input.code,
      type: input.type ?? null,
      areaSqft: input.areaSqft ?? null,
      ...(input.status ? { status: input.status } : {}),
    },
  });
  await writeAudit({
    action: "STRUCTURE.FLAT_CREATE",
    resource: "Flat",
    resourceId: flat.id,
    meta: { code: flat.code },
  });
  return flat;
}

export async function bulkCreateFlats(input: FlatBulkCreateInput) {
  await assertFloor(input.floorId);

  const codes = Array.from({ length: input.count }, (_, index) =>
    `${input.prefix}${String(input.start + index).padStart(input.pad, "0")}`,
  );

  const result = await prisma.flat.createMany({
    data: codes.map((code) => ({
      communityId: "",
      floorId: input.floorId,
      code,
      type: input.type ?? null,
      areaSqft: input.areaSqft ?? null,
    })),
    skipDuplicates: true,
  });

  await writeAudit({
    action: "STRUCTURE.FLAT_BULK_CREATE",
    resource: "Flat",
    meta: { floorId: input.floorId, requested: input.count, created: result.count },
  });

  const flats = await prisma.flat.findMany({
    where: { floorId: input.floorId, code: { in: codes } },
    orderBy: { code: "asc" },
  });

  return { created: result.count, skipped: input.count - result.count, flats };
}

export async function updateFlat(id: string, input: FlatUpdateInput) {
  const existing = await prisma.flat.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw AppError.notFound("We could not find that flat.");

  if (input.floorId) await assertFloor(input.floorId);

  return prisma.flat.update({
    where: { id },
    data: {
      ...(input.floorId !== undefined ? { floorId: input.floorId } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.areaSqft !== undefined ? { areaSqft: input.areaSqft } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
}

export async function deleteFlat(id: string) {
  const existing = await prisma.flat.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw AppError.notFound("We could not find that flat.");

  await prisma.flat.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ action: "STRUCTURE.FLAT_DELETE", resource: "Flat", resourceId: id });
}
