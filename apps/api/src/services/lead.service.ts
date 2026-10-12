import type { LeadCreateInput, LeadListQuery, DemoLeadStatus } from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { writeAudit } from "./audit.service.js";

export async function createLead(input: LeadCreateInput, ip?: string) {
  const lead = await prisma.demoLead.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      communityName: input.communityName,
      flats: input.flats ?? null,
      message: input.message ?? null,
      ip: ip ?? null,
    },
  });

  await writeAudit({
    action: "LEAD.CREATE",
    resource: "DemoLead",
    resourceId: lead.id,
    meta: { communityName: lead.communityName },
    ip,
  });

  return lead;
}

export async function listLeads(query: LeadListQuery) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" as const } },
            { communityName: { contains: query.q, mode: "insensitive" as const } },
            { email: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const { skip, take } = paginate(query.page, query.limit);

  const [items, total] = await Promise.all([
    prisma.demoLead.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.demoLead.count({ where }),
  ]);

  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function updateLeadStatus(id: string, status: DemoLeadStatus) {
  const lead = await prisma.demoLead.findUnique({ where: { id }, select: { id: true } });
  if (!lead) throw AppError.notFound("Lead not found.");

  const updated = await prisma.demoLead.update({ where: { id }, data: { status } });
  await writeAudit({ action: "PLATFORM.LEAD.STATUS", resource: "DemoLead", resourceId: id, meta: { status } });
  return updated;
}
