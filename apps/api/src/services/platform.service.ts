import { AppError } from "../errors/AppError.js";
import { prisma } from "../config/prisma.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { writeAudit } from "./audit.service.js";
import type {
  PlatformAssignSubscriptionInput,
  PlatformAuditQuery,
  PlatformCommunityListQuery,
  PlatformCreateCommunityInput,
  PlatformPlanInput,
  PlatformPlanUpdateInput,
  PlatformSubscriptionListQuery,
} from "@superlink/shared";

const TRIAL_DAYS = 30;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "community";
}

// ---------- Overview ----------

export async function getPlatformOverview() {
  const now = new Date();
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const [communityGroups, totalUsers, residents, staff, flats, subscriptionGroups, activePlanCount, usersByRole, recent, recentCommunities, activeSubscriptions] =
    await Promise.all([
      prisma.community.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "RESIDENT" } }),
      prisma.user.count({ where: { role: { in: ["SECURITY", "STAFF"] } } }),
      prisma.flat.count({ where: { deletedAt: null } }),
      prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.subscriptionPlan.count({ where: { isActive: true } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.community.findMany({ where: { deletedAt: null, createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
      prisma.community.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, name: true, city: true, status: true, createdAt: true },
      }),
      prisma.subscription.findMany({ where: { status: "ACTIVE" }, select: { plan: { select: { priceMonthlyInr: true } } } }),
    ]);

  const communityCount = (status: string) =>
    communityGroups.find((group) => group.status === status)?._count._all ?? 0;
  const subscriptionCount = (status: string) =>
    subscriptionGroups.find((group) => group.status === status)?._count._all ?? 0;

  const buckets = new Map<string, number>();
  for (let index = 5; index >= 0; index -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    buckets.set(start.toISOString().slice(0, 7), 0);
  }
  for (const community of recent) {
    const key = community.createdAt.toISOString().slice(0, 7);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const totalCommunities = communityGroups.reduce((sum, group) => sum + group._count._all, 0);
  const mrrInr = activeSubscriptions.reduce((sum, subscription) => sum + subscription.plan.priceMonthlyInr, 0);

  return {
    generatedAt: now.toISOString(),
    communities: {
      total: totalCommunities,
      active: communityCount("ACTIVE"),
      suspended: communityCount("SUSPENDED"),
    },
    users: {
      total: totalUsers,
      residents,
      staff,
      byRole: usersByRole.map((row) => ({ role: row.role, count: row._count._all })),
    },
    flats: { total: flats },
    subscriptions: {
      active: subscriptionCount("ACTIVE"),
      trial: subscriptionCount("TRIAL"),
      pastDue: subscriptionCount("PAST_DUE"),
      cancelled: subscriptionCount("CANCELLED"),
    },
    plans: { active: activePlanCount },
    revenue: { mrrInr },
    growth: [...buckets.entries()].map(([period, count]) => ({ period, count })),
    recentCommunities,
  };
}

// ---------- Communities ----------

export async function listCommunities(query: PlatformCommunityListQuery) {
  const where = {
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { name: { contains: query.q, mode: "insensitive" as const } } : {}),
  };
  const { skip, take } = paginate(query.page, query.limit);

  const [items, total] = await Promise.all([
    prisma.community.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        subscription: { include: { plan: { select: { code: true, name: true, priceMonthlyInr: true } } } },
        _count: { select: { users: true, flats: true } },
      },
    }),
    prisma.community.count({ where }),
  ]);

  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function createCommunity(input: PlatformCreateCommunityInput) {
  const slug = await slugifyUnique(input.name);

  let plan: { id: string } | null = null;
  if (input.planCode) {
    plan = await prisma.subscriptionPlan.findUnique({ where: { code: input.planCode }, select: { id: true } });
    if (!plan) throw AppError.validation("That subscription plan does not exist.", [
      { path: "planCode", message: "Unknown plan code." },
    ]);
  } else {
    plan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true },
      orderBy: { priceMonthlyInr: "asc" },
      select: { id: true },
    });
  }

  const community = await prisma.community.create({
    data: {
      name: input.name,
      slug,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      status: "ACTIVE",
    },
  });

  await prisma.communitySetting.create({ data: { communityId: community.id, currency: "INR" } });

  if (plan) {
    await prisma.subscription.create({
      data: {
        communityId: community.id,
        planId: plan.id,
        status: "TRIAL",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
  }

  await writeAudit({
    action: "PLATFORM.COMMUNITY.CREATE",
    resource: "Community",
    resourceId: community.id,
    meta: { name: community.name, planId: plan?.id ?? null },
  });

  return getCommunity(community.id);
}

export async function getCommunity(id: string) {
  const community = await prisma.community.findFirst({
    where: { id, deletedAt: null },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { users: true, flats: true } },
    },
  });
  if (!community) throw AppError.notFound("Community not found.");
  return community;
}

export async function setCommunityStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
  const community = await prisma.community.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!community) throw AppError.notFound("Community not found.");

  const updated = await prisma.community.update({ where: { id }, data: { status } });
  await writeAudit({
    action: "PLATFORM.COMMUNITY.STATUS",
    resource: "Community",
    resourceId: id,
    meta: { status },
  });
  return updated;
}

async function slugifyUnique(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;
  for (;;) {
    const existing = await prisma.community.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

// ---------- Plans ----------

function normalizeFeatures(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }
  return [];
}

export async function listPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { priceMonthlyInr: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });
  return plans.map((plan) => ({ ...plan, features: normalizeFeatures(plan.features) }));
}

export async function createPlan(input: PlatformPlanInput) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { code: input.code }, select: { id: true } });
  if (existing) throw AppError.conflict("A plan with that code already exists.");

  const plan = await prisma.subscriptionPlan.create({
    data: {
      code: input.code,
      name: input.name,
      priceMonthlyInr: input.priceMonthlyInr,
      flatLimit: input.flatLimit,
      features: input.features ?? [],
      isActive: true,
    },
  });
  await writeAudit({ action: "PLATFORM.PLAN.CREATE", resource: "SubscriptionPlan", resourceId: plan.id });
  return { ...plan, features: normalizeFeatures(plan.features) };
}

export async function updatePlan(id: string, input: PlatformPlanUpdateInput) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw AppError.notFound("Plan not found.");

  const plan = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.priceMonthlyInr !== undefined ? { priceMonthlyInr: input.priceMonthlyInr } : {}),
      ...(input.flatLimit !== undefined ? { flatLimit: input.flatLimit } : {}),
      ...(input.features !== undefined ? { features: input.features } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  await writeAudit({ action: "PLATFORM.PLAN.UPDATE", resource: "SubscriptionPlan", resourceId: plan.id });
  return { ...plan, features: normalizeFeatures(plan.features) };
}

// ---------- Subscriptions ----------

export async function listSubscriptions(query: PlatformSubscriptionListQuery) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { community: { name: { contains: query.q, mode: "insensitive" as const } } } : {}),
  };
  const { skip, take } = paginate(query.page, query.limit);

  const [items, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        plan: { select: { code: true, name: true, priceMonthlyInr: true } },
        community: { select: { id: true, name: true, status: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ]);

  return { items, meta: paginationMeta(query.page, query.limit, total) };
}

export async function assignSubscription(communityId: string, input: PlatformAssignSubscriptionInput) {
  const community = await prisma.community.findFirst({
    where: { id: communityId, deletedAt: null },
    select: { id: true },
  });
  if (!community) throw AppError.notFound("Community not found.");

  const existing = await prisma.subscription.findUnique({ where: { communityId } });

  let planId = existing?.planId ?? null;
  if (input.planCode) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: input.planCode }, select: { id: true } });
    if (!plan) throw AppError.validation("That subscription plan does not exist.", [
      { path: "planCode", message: "Unknown plan code." },
    ]);
    planId = plan.id;
  }
  if (!planId) {
    throw AppError.validation("Choose a plan for this community.", [
      { path: "planCode", message: "A plan is required." },
    ]);
  }

  const periodStart = input.periodStart ?? existing?.periodStart ?? new Date();
  const periodEnd = input.periodEnd ?? existing?.periodEnd ?? new Date(periodStart.getTime() + TRIAL_DAYS * 86_400_000);
  const status = input.status ?? existing?.status ?? "TRIAL";

  const subscription = await prisma.subscription.upsert({
    where: { communityId },
    create: { communityId, planId, status, periodStart, periodEnd },
    update: { planId, status, periodStart, periodEnd },
    include: { plan: { select: { code: true, name: true, priceMonthlyInr: true } } },
  });

  await writeAudit({
    action: "PLATFORM.SUBSCRIPTION.ASSIGN",
    resource: "Subscription",
    resourceId: subscription.id,
    meta: { communityId, planId, status },
  });

  return subscription;
}

// ---------- Audit ----------

export async function listAuditLogs(query: PlatformAuditQuery) {
  const where = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.q
      ? {
          OR: [
            { action: { contains: query.q, mode: "insensitive" as const } },
            { resource: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const { skip, take } = paginate(query.page, query.limit);

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, meta: paginationMeta(query.page, query.limit, total) };
}
