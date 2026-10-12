import type { Prisma } from "@prisma/client";
import type {
  DomesticStaffCreateInput,
  DomesticStaffListQuery,
  DomesticStaffUpdateInput,
  StaffEntryCreateInput,
  StaffEntryListQuery,
  StaffProfileCreateInput,
  StaffProfileListQuery,
  StaffProfileUpdateInput,
} from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { AuthContext } from "../tenant/context.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";

const STAFF_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  status: true,
} as const;

function isAdmin(auth: AuthContext): boolean {
  return auth.role === "SUPER_ADMIN" || auth.role === "COMMUNITY_ADMIN";
}

async function myFlatIds(userId: string): Promise<string[]> {
  const occupancies = await prisma.flatOccupant.findMany({
    where: { userId, movedOutAt: null },
    select: { flatId: true },
  });
  return occupancies.map((occupancy) => occupancy.flatId);
}

// ---------- Staff profiles (community staff) ----------

export async function listStaffUsers() {
  return prisma.user.findMany({
    where: { role: "STAFF", status: "ACTIVE", deletedAt: null },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: STAFF_USER_SELECT,
  });
}

export async function listStaffProfiles(query: StaffProfileListQuery) {
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.StaffProfileWhereInput = {};
  if (query.trade) where.trade = query.trade;
  if (query.availability) where.availability = query.availability;
  if (query.q) {
    where.OR = [
      { trade: { contains: query.q, mode: "insensitive" } },
      { user: { firstName: { contains: query.q, mode: "insensitive" } } },
      { user: { lastName: { contains: query.q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.staffProfile.count({ where }),
    prisma.staffProfile.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: STAFF_USER_SELECT } },
    }),
  ]);

  return { items: rows, meta: paginationMeta(query.page, query.limit, total) };
}

export async function createStaffProfile(input: StaffProfileCreateInput) {
  const user = await prisma.user.findFirst({
    where: { id: input.userId, role: "STAFF", status: "ACTIVE" },
    select: { id: true },
  });
  if (!user) throw AppError.notFound("We could not find that staff member.");

  const existing = await prisma.staffProfile.findUnique({ where: { userId: input.userId } });
  if (existing) throw AppError.conflict("That staff member already has a profile.");

  const profile = await prisma.staffProfile.create({
    data: {
      communityId: "",
      userId: input.userId,
      trade: input.trade,
      availability: input.availability,
      phone: input.phone ?? null,
    },
    include: { user: { select: STAFF_USER_SELECT } },
  });
  await writeAudit({ action: "STAFF.PROFILE_CREATE", resource: "StaffProfile", resourceId: profile.id });
  return profile;
}

export async function updateStaffProfile(id: string, input: StaffProfileUpdateInput) {
  const existing = await prisma.staffProfile.findFirst({ where: { id }, select: { id: true } });
  if (!existing) throw AppError.notFound("We could not find that staff profile.");

  const updated = await prisma.staffProfile.update({
    where: { id },
    data: {
      ...(input.trade !== undefined ? { trade: input.trade } : {}),
      ...(input.availability !== undefined ? { availability: input.availability } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    },
    include: { user: { select: STAFF_USER_SELECT } },
  });
  await writeAudit({ action: "STAFF.PROFILE_UPDATE", resource: "StaffProfile", resourceId: id });
  return updated;
}

// ---------- Staff gate entries ----------

export async function listStaffEntries(query: StaffEntryListQuery) {
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.StaffEntryWhereInput = {};
  if (query.staffUserId) where.staffUserId = query.staffUserId;
  if (query.direction) where.direction = query.direction;

  const [total, rows] = await Promise.all([
    prisma.staffEntry.count({ where }),
    prisma.staffEntry.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
        guard: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  return { items: rows, meta: paginationMeta(query.page, query.limit, total) };
}

export async function createStaffEntry(input: StaffEntryCreateInput) {
  const auth = authContextOrThrow();
  const staff = await prisma.user.findFirst({
    where: { id: input.staffUserId, role: "STAFF", status: "ACTIVE" },
    select: { id: true },
  });
  if (!staff) throw AppError.notFound("We could not find that staff member.");

  const entry = await prisma.staffEntry.create({
    data: {
      communityId: "",
      staffUserId: staff.id,
      direction: input.direction,
      guardUserId: auth.userId || null,
      note: input.note ?? null,
    },
  });
  await writeAudit({
    action: "STAFF.ENTRY",
    resource: "StaffEntry",
    resourceId: entry.id,
    meta: { direction: input.direction },
  });
  return entry;
}

// ---------- Domestic staff (help registered at flats) ----------

export async function listDomesticStaff(query: DomesticStaffListQuery) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.DomesticStaffWhereInput = { ...(await domesticStaffScope(auth)) };
  if (query.flatId) where.flatId = query.flatId;
  if (query.workType) where.workType = query.workType;
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { phone: { contains: query.q } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.domesticStaff.count({ where }),
    prisma.domesticStaff.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { flat: { select: { id: true, code: true } } },
    }),
  ]);

  return { items: rows, meta: paginationMeta(query.page, query.limit, total) };
}

async function domesticStaffScope(auth: AuthContext): Promise<Prisma.DomesticStaffWhereInput> {
  if (isAdmin(auth) || auth.role === "SECURITY") return {};
  return { flatId: { in: await myFlatIds(auth.userId) } };
}

export async function createDomesticStaff(input: DomesticStaffCreateInput) {
  const auth = authContextOrThrow();
  let flatId = input.flatId ?? null;

  if (isAdmin(auth)) {
    if (!flatId) throw AppError.validation("Please choose a flat.");
  } else {
    const flats = await myFlatIds(auth.userId);
    if (flatId && !flats.includes(flatId)) {
      throw AppError.forbidden("You can only register staff for your own flat.");
    }
    flatId = flatId ?? flats[0] ?? null;
  }
  if (!flatId) throw AppError.validation("No flat is linked to your account yet.");

  const flat = await prisma.flat.findFirst({ where: { id: flatId, deletedAt: null }, select: { id: true } });
  if (!flat) throw AppError.notFound("We could not find that flat.");

  const staff = await prisma.domesticStaff.create({
    data: {
      communityId: "",
      flatId,
      name: input.name,
      phone: input.phone ?? null,
      idInfo: input.idInfo ?? null,
      workType: input.workType,
      status: input.status ?? "ACTIVE",
    },
    include: { flat: { select: { id: true, code: true } } },
  });
  await writeAudit({
    action: "STAFF.DOMESTIC_CREATE",
    resource: "DomesticStaff",
    resourceId: staff.id,
    meta: { flatId },
  });
  return staff;
}

export async function updateDomesticStaff(id: string, input: DomesticStaffUpdateInput) {
  const auth = authContextOrThrow();
  const existing = await prisma.domesticStaff.findFirst({ where: { id }, select: { id: true, flatId: true } });
  if (!existing) throw AppError.notFound("We could not find that staff member.");
  if (!isAdmin(auth)) {
    const flats = await myFlatIds(auth.userId);
    if (!flats.includes(existing.flatId)) {
      throw AppError.forbidden("You can only manage staff for your own flat.");
    }
  }

  const updated = await prisma.domesticStaff.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.idInfo !== undefined ? { idInfo: input.idInfo } : {}),
      ...(input.workType !== undefined ? { workType: input.workType } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
  await writeAudit({ action: "STAFF.DOMESTIC_UPDATE", resource: "DomesticStaff", resourceId: id });
  return updated;
}

export async function listDomesticStaffForRefs(query: DomesticStaffListQuery) {
  return listDomesticStaff(query);
}

export type { DomesticStaffCreateInput, DomesticStaffUpdateInput };
