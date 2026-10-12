import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import type { AssignFlatInput, FamilyMemberCreateInput, ResidentCreateInput, ResidentListQuery, ResidentUpdateInput } from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { writeAudit } from "./audit.service.js";

const RESIDENT_SELECT = {
  id: true,
  communityId: true,
  role: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
  flatOccupancies: {
    where: { movedOutAt: null },
    select: {
      id: true,
      relation: true,
      isPrimary: true,
      flat: { select: { id: true, code: true } },
    },
  },
} as const;

async function placeholderPasswordHash(): Promise<string> {
  return argon2.hash(randomBytes(32).toString("base64url"));
}

export async function listResidents(query: ResidentListQuery) {
  const { skip, take } = paginate(query.page, query.limit);
  const where = {
    role: "RESIDENT" as const,
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { firstName: { contains: query.q, mode: "insensitive" as const } },
            { lastName: { contains: query.q, mode: "insensitive" as const } },
            { email: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, residents] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, select: RESIDENT_SELECT }),
  ]);

  return { items: residents, meta: paginationMeta(query.page, query.limit, total) };
}

export async function getResident(id: string) {
  const resident = await prisma.user.findFirst({
    where: { id, role: "RESIDENT", deletedAt: null },
    select: {
      ...RESIDENT_SELECT,
      flatOccupancies: {
        where: { movedOutAt: null },
        select: {
          id: true,
          relation: true,
          isPrimary: true,
          movedInAt: true,
          flat: {
            select: {
              id: true,
              code: true,
              type: true,
              status: true,
              floor: {
                select: {
                  id: true,
                  number: true,
                  label: true,
                  building: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!resident) throw AppError.notFound("We could not find that resident.");
  return resident;
}

export async function createResident(input: ResidentCreateInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw AppError.conflict("A user with that email already exists.");

  if (input.flatId) await assertFlat(input.flatId);

  const passwordHash = await placeholderPasswordHash();
  const resident = await prisma.user.create({
    data: {
      communityId: "",
      email,
      role: "RESIDENT",
      status: "INVITED",
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      passwordHash,
    },
    select: RESIDENT_SELECT,
  });

  if (input.flatId) {
    await attachOccupant(resident.id, input.flatId, input.relation ?? "OWNER", true);
  }

  await writeAudit({
    action: "RESIDENT.CREATE",
    resource: "User",
    resourceId: resident.id,
    meta: { email },
  });

  return getResident(resident.id);
}

export async function updateResident(id: string, input: ResidentUpdateInput) {
  const existing = await prisma.user.findFirst({
    where: { id, role: "RESIDENT", deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw AppError.notFound("We could not find that resident.");

  await prisma.user.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });

  return getResident(id);
}

async function assertFlat(flatId: string) {
  const flat = await prisma.flat.findFirst({ where: { id: flatId, deletedAt: null }, select: { id: true } });
  if (!flat) throw AppError.notFound("We could not find that flat.");
  return flat;
}

async function attachOccupant(
  userId: string,
  flatId: string,
  relation: "OWNER" | "TENANT",
  isPrimary: boolean,
): Promise<string> {
  if (isPrimary) {
    await prisma.flatOccupant.updateMany({
      where: { flatId, isPrimary: true, movedOutAt: null },
      data: { isPrimary: false },
    });
  }
  const occupant = await prisma.flatOccupant.create({
    data: { communityId: "", userId, flatId, relation, isPrimary, movedInAt: new Date() },
  });
  await prisma.flat.update({ where: { id: flatId }, data: { status: "OCCUPIED" } });
  return occupant.id;
}

export async function assignFlat(userId: string, input: AssignFlatInput) {
  const resident = await prisma.user.findFirst({
    where: { id: userId, role: "RESIDENT", deletedAt: null },
    select: { id: true },
  });
  if (!resident) throw AppError.notFound("We could not find that resident.");

  await assertFlat(input.flatId);
  const occupantId = await attachOccupant(userId, input.flatId, input.relation, input.isPrimary ?? true);

  await writeAudit({
    action: "RESIDENT.ASSIGN_FLAT",
    resource: "FlatOccupant",
    resourceId: occupantId,
    meta: { userId, flatId: input.flatId, relation: input.relation },
  });

  return getResident(userId);
}

export async function unassignFlat(userId: string, occupantId: string) {
  const occupant = await prisma.flatOccupant.findFirst({
    where: { id: occupantId, userId, movedOutAt: null },
  });
  if (!occupant) throw AppError.notFound("We could not find that occupancy.");

  await prisma.flatOccupant.update({
    where: { id: occupantId },
    data: { movedOutAt: new Date() },
  });

  const remaining = await prisma.flatOccupant.count({
    where: { flatId: occupant.flatId, movedOutAt: null },
  });
  if (remaining === 0) {
    await prisma.flat.update({ where: { id: occupant.flatId }, data: { status: "VACANT" } });
  }

  await writeAudit({
    action: "RESIDENT.UNASSIGN_FLAT",
    resource: "FlatOccupant",
    resourceId: occupantId,
    meta: { userId },
  });

  return getResident(userId);
}

// ---------- Family members ----------

export async function addFamilyMember(flatId: string, input: FamilyMemberCreateInput) {
  await assertFlat(flatId);
  const member = await prisma.familyMember.create({
    data: {
      communityId: "",
      flatId,
      name: input.name,
      relation: input.relation,
      phone: input.phone ?? null,
      age: input.age ?? null,
      isStaff: input.isStaff ?? false,
    },
  });
  await writeAudit({
    action: "RESIDENT.FAMILY_ADD",
    resource: "FamilyMember",
    resourceId: member.id,
    meta: { flatId },
  });
  return member;
}

export async function removeFamilyMember(id: string) {
  const member = await prisma.familyMember.findFirst({ where: { id } });
  if (!member) throw AppError.notFound("We could not find that family member.");

  await prisma.familyMember.delete({ where: { id } });
  await writeAudit({ action: "RESIDENT.FAMILY_REMOVE", resource: "FamilyMember", resourceId: id });
}
