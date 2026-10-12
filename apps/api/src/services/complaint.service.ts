import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { AuthContext } from "../tenant/context.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";
import { createNotification } from "./notification.service.js";

const COMPLAINT_INCLUDE = {
  raisedBy: { select: { id: true, firstName: true, lastName: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  category: { select: { id: true, name: true } },
  flat: { select: { id: true, code: true } },
  _count: { select: { comments: true } },
} as const;

type ComplaintRow = Prisma.ComplaintGetPayload<{ include: typeof COMPLAINT_INCLUDE }>;

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

async function complaintWhereFor(auth: AuthContext): Promise<Prisma.ComplaintWhereInput> {
  if (isAdmin(auth)) return {};
  if (auth.role === "STAFF") return { assignedToId: auth.userId };
  return {
    OR: [{ raisedById: auth.userId }, { flatId: { in: await myFlatIds(auth.userId) } }],
  };
}

async function findVisibleComplaint(id: string, auth: AuthContext): Promise<ComplaintRow> {
  const scope = await complaintWhereFor(auth);
  const complaint = await prisma.complaint.findFirst({
    where: { id, ...scope },
    include: COMPLAINT_INCLUDE,
  });
  if (!complaint) throw AppError.notFound("We could not find that complaint.");
  return complaint;
}

async function notifyFlatOccupants(flatId: string | null, title: string, body: string, data: Record<string, unknown>) {
  if (!flatId) return;
  const occupants = await prisma.flatOccupant.findMany({
    where: { flatId, movedOutAt: null },
    select: { userId: true },
  });
  await Promise.all(
    occupants.map((occupant) =>
      createNotification({ userId: occupant.userId, type: "COMPLAINT", title, body, data }),
    ),
  );
}

async function notifyAdmins(title: string, body: string, data: Record<string, unknown>) {
  const admins = await prisma.user.findMany({
    where: { role: "COMMUNITY_ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      createNotification({ userId: admin.id, type: "COMPLAINT", title, body, data }),
    ),
  );
}

// ---------- Categories ----------

export async function listCategories(includeInactive = false) {
  return prisma.complaintCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(input: { name: string; description?: string; slaHours?: number; sortOrder?: number; isActive?: boolean }) {
  const existing = await prisma.complaintCategory.findFirst({ where: { name: input.name } });
  if (existing) throw AppError.conflict("A category with that name already exists.");
  const category = await prisma.complaintCategory.create({
    data: {
      communityId: "",
      name: input.name,
      description: input.description ?? null,
      slaHours: input.slaHours ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  await writeAudit({ action: "COMPLAINT.CATEGORY_CREATE", resource: "ComplaintCategory", resourceId: category.id });
  return category;
}

export async function updateCategory(id: string, input: { name?: string; description?: string; slaHours?: number; sortOrder?: number; isActive?: boolean }) {
  const existing = await prisma.complaintCategory.findFirst({ where: { id } });
  if (!existing) throw AppError.notFound("We could not find that category.");
  if (input.name && input.name !== existing.name) {
    const clash = await prisma.complaintCategory.findFirst({ where: { name: input.name } });
    if (clash) throw AppError.conflict("A category with that name already exists.");
  }
  const category = await prisma.complaintCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.slaHours !== undefined ? { slaHours: input.slaHours } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  await writeAudit({ action: "COMPLAINT.CATEGORY_UPDATE", resource: "ComplaintCategory", resourceId: id });
  return category;
}

// ---------- Complaints ----------

export async function listComplaints(query: { status?: string; priority?: string; categoryId?: string; flatId?: string; assignedToId?: string; mine?: boolean; q?: string; page: number; limit: number }) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.ComplaintWhereInput = { ...(await complaintWhereFor(auth)) };

  if (query.status) where.status = query.status as never;
  if (query.priority) where.priority = query.priority as never;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.flatId) where.flatId = query.flatId;
  if (query.assignedToId) where.assignedToId = query.assignedToId;
  if (query.mine && auth.role === "STAFF") where.assignedToId = auth.userId;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: COMPLAINT_INCLUDE }),
  ]);

  return { items: rows, meta: paginationMeta(query.page, query.limit, total) };
}

export async function getComplaint(id: string) {
  const auth = authContextOrThrow();
  const complaint = await findVisibleComplaint(id, auth);
  const comments = await prisma.complaintComment.findMany({
    where: { complaintId: id, ...(isAdmin(auth) ? {} : { isInternal: false }) },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
  });
  const assignments = await prisma.staffAssignment.findMany({
    where: { complaintId: id },
    orderBy: { createdAt: "desc" },
    include: {
      staff: { select: { id: true, firstName: true, lastName: true } },
      assignedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return { complaint, comments, assignments };
}

export async function createComplaint(input: {
  title: string;
  description: string;
  categoryId?: string;
  flatId?: string;
  priority?: string;
  location?: string;
}) {
  const auth = authContextOrThrow();
  let flatId: string | null = input.flatId ?? null;

  if (!isAdmin(auth)) {
    if (input.flatId) {
      const flats = await myFlatIds(auth.userId);
      if (!flats.includes(input.flatId)) {
        throw AppError.forbidden("You can only raise complaints for your own flat.");
      }
    } else {
      flatId = (await myFlatIds(auth.userId))[0] ?? null;
    }
  } else if (flatId) {
    const flat = await prisma.flat.findFirst({ where: { id: flatId, deletedAt: null }, select: { id: true } });
    if (!flat) throw AppError.notFound("We could not find that flat.");
    flatId = flat.id;
  }

  if (input.categoryId) {
    const category = await prisma.complaintCategory.findFirst({ where: { id: input.categoryId } });
    if (!category) throw AppError.notFound("We could not find that category.");
  }

  const complaint = await prisma.complaint.create({
    data: {
      communityId: "",
      flatId,
      raisedById: auth.userId,
      categoryId: input.categoryId ?? null,
      title: input.title,
      description: input.description,
      priority: (input.priority ?? "MEDIUM") as never,
      location: input.location ?? null,
    },
    include: COMPLAINT_INCLUDE,
  });

  await writeAudit({
    action: "COMPLAINT.CREATE",
    resource: "Complaint",
    resourceId: complaint.id,
    meta: { priority: complaint.priority, flatId },
  });

  if (!isAdmin(auth)) {
    await notifyAdmins("New complaint raised", complaint.title, { complaintId: complaint.id });
  }

  return complaint;
}

export async function updateComplaint(id: string, input: {
  title?: string;
  description?: string;
  categoryId?: string | null;
  priority?: string;
  status?: string;
  location?: string | null;
}) {
  const auth = authContextOrThrow();
  const existing = await findVisibleComplaint(id, auth);

  if (auth.role === "STAFF") {
    if (existing.assignedToId !== auth.userId) {
      throw AppError.forbidden("This complaint is not assigned to you.");
    }
    if (input.status === undefined) {
      throw AppError.forbidden("As staff you can only update the status of your assigned complaints.");
    }
  }

  const data: Prisma.ComplaintUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority as never;
  if (input.location !== undefined) data.location = input.location;
  if (input.categoryId !== undefined) {
    data.category = input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true };
  }
  if (input.status !== undefined) {
    data.status = input.status as never;
    if (input.status === "RESOLVED") data.resolvedAt = new Date();
    if (input.status === "CLOSED") data.closedAt = new Date();
  }

  const updated = await prisma.complaint.update({ where: { id }, data, include: COMPLAINT_INCLUDE });

  await writeAudit({
    action: "COMPLAINT.UPDATE",
    resource: "Complaint",
    resourceId: id,
    meta: { status: input.status },
  });

  if (input.status && input.status !== existing.status) {
    await notifyFlatOccupants(
      updated.flatId,
      "Complaint updated",
      `Your complaint "${updated.title}" is now ${input.status.replace("_", " ").toLowerCase()}.`,
      { complaintId: id, status: input.status },
    );
  }

  return updated;
}

export async function assignComplaint(id: string, input: { staffUserId: string; note?: string }) {
  const auth = authContextOrThrow();
  const existing = await findVisibleComplaint(id, auth);
  if (existing.status === "CLOSED") {
    throw AppError.conflict("This complaint is closed and cannot be reassigned.");
  }

  const staff = await prisma.user.findFirst({
    where: { id: input.staffUserId, role: "STAFF", status: "ACTIVE" },
    select: { id: true, firstName: true },
  });
  if (!staff) throw AppError.notFound("We could not find that staff member.");

  const [updated] = await prisma.$transaction([
    prisma.complaint.update({
      where: { id },
      data: { assignedToId: staff.id, status: "ASSIGNED" },
      include: COMPLAINT_INCLUDE,
    }),
    prisma.staffAssignment.create({
      data: {
        communityId: "",
        complaintId: id,
        staffUserId: staff.id,
        assignedById: auth.userId || null,
        note: input.note ?? null,
      },
    }),
  ]);

  await createNotification({
    userId: staff.id,
    type: "COMPLAINT",
    title: "New task assigned",
    body: `You have been assigned: ${updated.title}`,
    data: { complaintId: id },
  });

  await writeAudit({
    action: "COMPLAINT.ASSIGN",
    resource: "Complaint",
    resourceId: id,
    meta: { staffUserId: staff.id },
  });

  return updated;
}

export async function addComment(id: string, input: { body: string; isInternal?: boolean }) {
  const auth = authContextOrThrow();
  const complaint = await findVisibleComplaint(id, auth);
  const isStaffOrAdmin = isAdmin(auth) || auth.role === "STAFF";
  const isInternal = Boolean(input.isInternal) && isStaffOrAdmin;

  const comment = await prisma.complaintComment.create({
    data: {
      communityId: "",
      complaintId: id,
      authorId: auth.userId,
      body: input.body,
      isInternal: isInternal && input.isInternal === true,
    },
    include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
  });

  if (!isStaffOrAdmin) {
    const adminIds = await prisma.user.findMany({
      where: { role: "COMMUNITY_ADMIN", status: "ACTIVE" },
      select: { id: true },
    });
    await Promise.all(
      adminIds.map((admin) =>
        createNotification({
          userId: admin.id,
          type: "COMPLAINT",
          title: "New comment on a complaint",
          body: complaint.title,
          data: { complaintId: id },
        }),
      ),
    );
  } else if (complaint.raisedById !== auth.userId) {
    await createNotification({
      userId: complaint.raisedById,
      type: "COMPLAINT",
      title: "New reply on your complaint",
      body: complaint.title,
      data: { complaintId: id },
    });
  }

  await writeAudit({ action: "COMPLAINT.COMMENT", resource: "Complaint", resourceId: id });
  return { complaintId: id, comment };
}

export async function rateComplaint(id: string, input: { rating: number }) {
  const auth = authContextOrThrow();
  const complaint = await findVisibleComplaint(id, auth);
  if (complaint.raisedById !== auth.userId) {
    throw AppError.forbidden("Only the person who raised the complaint can rate it.");
  }
  if (complaint.status !== "RESOLVED" && complaint.status !== "CLOSED") {
    throw AppError.conflict("You can rate a complaint once it is resolved.");
  }
  const updated = await prisma.complaint.update({
    where: { id },
    data: { rating: input.rating },
    include: COMPLAINT_INCLUDE,
  });
  await writeAudit({ action: "COMPLAINT.RATE", resource: "Complaint", resourceId: id, meta: { rating: input.rating } });
  return updated;
}
