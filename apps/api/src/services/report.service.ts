import { AppError } from "../errors/AppError.js";
import { prisma } from "../config/prisma.js";
import { authContextOrThrow } from "../middleware/rbac.js";

function periodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStartUtc(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1));
}

function addMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function round(value: number): number {
  return Math.round(value);
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 100;
  return Math.min(100, round((numerator / denominator) * 100));
}

// ---------- Overview ----------

export async function getOverview() {
  authContextOrThrow();
  const now = new Date();
  const current = periodKey(now);
  const monthStart = monthStartUtc(now.getUTCFullYear(), now.getUTCMonth());
  const nextMonthStart = addMonths(monthStart, 1);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [
    flatGroups,
    residentTotal,
    residentInvited,
    activePasses,
    pendingPasses,
    entriesToday,
    complaintGroups,
    resolvedComplaints,
    cycleBills,
    overdueBills,
    expenseThisMonth,
    emergencyGroups,
    emergencyLast90,
  ] = await Promise.all([
    prisma.flat.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.user.count({ where: { role: "RESIDENT", deletedAt: null } }),
    prisma.user.count({ where: { role: "RESIDENT", status: "INVITED", deletedAt: null } }),
    prisma.visitorPass.count({ where: { status: "ACTIVE" } }),
    prisma.visitorPass.count({ where: { status: "PENDING" } }),
    prisma.visitorEntry.count({ where: { direction: "IN", createdAt: { gte: todayStart } } }),
    prisma.complaint.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.complaint.findMany({
      where: { resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      orderBy: { resolvedAt: "desc" },
      take: 500,
    }),
    prisma.maintenanceBill.findMany({ where: { period: current }, select: { id: true, totalInr: true, status: true } }),
    prisma.maintenanceBill.aggregate({ where: { status: "OVERDUE" }, _sum: { totalInr: true } }),
    prisma.expense.aggregate({
      where: { spentAt: { gte: monthStart, lt: nextMonthStart } },
      _sum: { amountInr: true },
    }),
    prisma.emergencyAlert.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.emergencyAlert.count({ where: { createdAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } } }),
  ]);

  const flatCount = (status: string) =>
    flatGroups.find((group) => group.status === status)?._count._all ?? 0;
  const totalFlats = flatGroups.reduce((sum, group) => sum + group._count._all, 0);
  const occupiedFlats = flatCount("OCCUPIED");

  const complaintCount = (status: string) =>
    complaintGroups.find((group) => group.status === status)?._count._all ?? 0;
  const totalComplaints = complaintGroups.reduce((sum, group) => sum + group._count._all, 0);
  const openComplaints =
    complaintCount("OPEN") + complaintCount("ASSIGNED") + complaintCount("IN_PROGRESS");
  const resolvedComplaintsCount = complaintCount("RESOLVED") + complaintCount("CLOSED");

  const durations = resolvedComplaints
    .filter((row) => row.resolvedAt)
    .map((row) => (row.resolvedAt!.getTime() - row.createdAt.getTime()) / (60 * 60 * 1000));
  const avgResolutionHours = durations.length
    ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10
    : null;

  const cycleBillIds = cycleBills.map((bill) => bill.id);
  const collected = cycleBillIds.length
    ? await prisma.payment.aggregate({
        where: { billId: { in: cycleBillIds }, status: "SUCCESS" },
        _sum: { amountInr: true },
      })
    : { _sum: { amountInr: 0 } };
  const billedInr = cycleBills.reduce((sum, bill) => sum + bill.totalInr, 0);
  const collectedInr = collected._sum.amountInr ?? 0;

  const emergencyCount = (status: string) =>
    emergencyGroups.find((group) => group.status === status)?._count._all ?? 0;

  return {
    generatedAt: now.toISOString(),
    flats: {
      total: totalFlats,
      occupied: occupiedFlats,
      vacant: flatCount("VACANT"),
      blocked: flatCount("BLOCKED"),
      occupancyRate: pct(occupiedFlats, totalFlats),
    },
    residents: {
      total: residentTotal,
      active: residentTotal - residentInvited,
      invited: residentInvited,
    },
    visitors: { activePasses, pendingPasses, entriesToday },
    complaints: {
      total: totalComplaints,
      open: openComplaints,
      resolved: resolvedComplaintsCount,
      resolutionRate: pct(resolvedComplaintsCount, totalComplaints),
      avgResolutionHours,
      byStatus: complaintGroups.map((group) => ({ status: group.status, count: group._count._all })),
    },
    billing: {
      period: current,
      billedInr,
      collectedInr,
      outstandingInr: Math.max(0, billedInr - collectedInr),
      overdueInr: overdueBills._sum.totalInr ?? 0,
      collectionRate: pct(collectedInr, billedInr),
    },
    expenses: { thisMonthInr: expenseThisMonth._sum.amountInr ?? 0 },
    emergency: {
      active: emergencyCount("TRIGGERED") + emergencyCount("ACKNOWLEDGED"),
      last90Days: emergencyLast90,
    },
  };
}

// ---------- Trend ----------

export async function getCollectionsTrend(months: number) {
  authContextOrThrow();
  const now = new Date();
  const currentMonth = monthStartUtc(now.getUTCFullYear(), now.getUTCMonth());

  const keys = Array.from({ length: months }, (_, index) => {
    const start = addMonths(currentMonth, index - (months - 1));
    return { period: periodKey(start), start, end: addMonths(start, 1) };
  });

  const results = await Promise.all(
    keys.map(async ({ period, start, end }) => {
      const [billed, collected] = await Promise.all([
        prisma.maintenanceBill.aggregate({ where: { period }, _sum: { totalInr: true } }),
        prisma.payment.aggregate({
          where: { status: "SUCCESS", createdAt: { gte: start, lt: end } },
          _sum: { amountInr: true },
        }),
      ]);
      return {
        period,
        label: start.toLocaleString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }),
        billedInr: billed._sum.totalInr ?? 0,
        collectedInr: collected._sum.amountInr ?? 0,
      };
    }),
  );

  return results;
}

// ---------- Breakdown ----------

export async function getBreakdown() {
  authContextOrThrow();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [complaintByStatus, complaintByPriority, complaintByCategory, expenseByCategory, emergencyByCategory] =
    await Promise.all([
      prisma.complaint.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.complaint.groupBy({ by: ["priority"], _count: { _all: true } }),
      prisma.complaint.groupBy({ by: ["categoryId"], _count: { _all: true } }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: { spentAt: { gte: thirtyDaysAgo } },
        _sum: { amountInr: true },
      }),
      prisma.emergencyAlert.groupBy({
        by: ["category"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      }),
    ]);

  const categoryIds = [
    ...complaintByCategory.map((row) => row.categoryId).filter((id): id is string => Boolean(id)),
    ...expenseByCategory.map((row) => row.categoryId).filter((id): id is string => Boolean(id)),
  ];
  const [complaintCategories, expenseCategories] = await Promise.all([
    prisma.complaintCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    }),
    prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    }),
  ]);
  const complaintNames = new Map(complaintCategories.map((row) => [row.id, row.name]));
  const expenseNames = new Map(expenseCategories.map((row) => [row.id, row.name]));

  return {
    complaintsByStatus: complaintByStatus.map((row) => ({ status: row.status, count: row._count._all })),
    complaintsByPriority: complaintByPriority.map((row) => ({ priority: row.priority, count: row._count._all })),
    complaintsByCategory: complaintByCategory
      .map((row) => ({
        name: row.categoryId ? (complaintNames.get(row.categoryId) ?? "Uncategorised") : "Uncategorised",
        count: row._count._all,
      }))
      .sort((a, b) => b.count - a.count),
    expensesByCategory: expenseByCategory
      .map((row) => ({
        name: row.categoryId ? (expenseNames.get(row.categoryId) ?? "Uncategorised") : "Uncategorised",
        amountInr: row._sum.amountInr ?? 0,
      }))
      .sort((a, b) => b.amountInr - a.amountInr),
    emergencyByCategory: emergencyByCategory
      .map((row) => ({ category: row.category, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}

// ---------- Health scorecard ----------

export interface ScorecardMetric {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export async function getScorecard() {
  authContextOrThrow();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [overview, entries30, covered30] = await Promise.all([
    getOverview(),
    prisma.visitorEntry.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.visitorEntry.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        OR: [{ method: { in: ["QR", "MANUAL"] } }, { passId: { not: null } }],
      },
    }),
  ]);

  const safetyBase = overview.emergency.last90Days
    ? pct(
        Math.max(0, overview.emergency.last90Days - overview.emergency.active),
        overview.emergency.last90Days,
      )
    : 100;
  const safetyScore = Math.max(0, safetyBase - Math.min(50, overview.emergency.active * 25));

  const metrics: ScorecardMetric[] = [
    {
      key: "occupancy",
      label: "Occupancy",
      score: overview.flats.occupancyRate,
      weight: 25,
      detail: `${overview.flats.occupied}/${overview.flats.total} flats occupied`,
    },
    {
      key: "collections",
      label: "Collections",
      score: overview.billing.collectionRate,
      weight: 25,
      detail: `₹${overview.billing.collectedInr.toLocaleString("en-IN")} of ₹${overview.billing.billedInr.toLocaleString("en-IN")} billed (${overview.billing.period})`,
    },
    {
      key: "complaints",
      label: "Complaint resolution",
      score: overview.complaints.resolutionRate,
      weight: 25,
      detail: `${overview.complaints.resolved}/${overview.complaints.total} resolved${
        overview.complaints.avgResolutionHours !== null
          ? ` · avg ${overview.complaints.avgResolutionHours}h`
          : ""
      }`,
    },
    {
      key: "safety",
      label: "Emergency readiness",
      score: safetyScore,
      weight: 15,
      detail: overview.emergency.active === 0 ? "No active alerts" : `${overview.emergency.active} active alert(s)`,
    },
    {
      key: "security",
      label: "Gate compliance",
      score: pct(covered30, entries30),
      weight: 10,
      detail: entries30 === 0 ? "No gate entries in 30 days" : `${covered30}/${entries30} entries checked in via pass (30d)`,
    },
  ];

  const overall = round(metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0) / 100);
  const grade = overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : overall >= 60 ? "D" : "E";

  return {
    generatedAt: overview.generatedAt,
    overall,
    grade,
    metrics,
    summary: {
      residents: overview.residents.total,
      flats: overview.flats.total,
      openComplaints: overview.complaints.open,
      averageResolutionHours: overview.complaints.avgResolutionHours,
    },
  };
}

// ---------- Guard shift handover ----------

const DEFAULT_HANDOVER_HOURS = 12;

export async function getHandoverReport(query: { from?: Date; to?: Date }) {
  authContextOrThrow();
  const to = query.to ?? new Date();
  const from = query.from ?? new Date(to.getTime() - DEFAULT_HANDOVER_HOURS * 60 * 60 * 1000);
  if (from > to) throw AppError.validation("The handover window is invalid.");
  const within = { gte: from, lte: to };

  const [
    visitorEntries,
    visitorTotal,
    visitorIn,
    visitorOut,
    walkIns,
    deliveries,
    deliveryEvents,
    deliveryEventCount,
    staffEntries,
    staffEntryCount,
    emergencyAlerts,
    emergencyAlertCount,
    activeAlerts,
  ] = await Promise.all([
    prisma.visitorEntry.findMany({
      where: { createdAt: within },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        visitor: { select: { id: true, name: true, phone: true, flat: { select: { code: true } } } },
        pass: { select: { code: true } },
        guard: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.visitorEntry.count({ where: { createdAt: within } }),
    prisma.visitorEntry.count({ where: { createdAt: within, direction: "IN" } }),
    prisma.visitorEntry.count({ where: { createdAt: within, direction: "OUT" } }),
    prisma.visitorEntry.count({ where: { createdAt: within, method: "WALK_IN" } }),
    prisma.delivery.count({ where: { createdAt: within } }),
    prisma.deliveryEntry.findMany({
      where: { createdAt: within },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        delivery: {
          select: { id: true, category: true, company: true, personName: true, flat: { select: { code: true } } },
        },
        guard: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.deliveryEntry.count({ where: { createdAt: within } }),
    prisma.staffEntry.findMany({
      where: { createdAt: within },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
        guard: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.staffEntry.count({ where: { createdAt: within } }),
    prisma.emergencyAlert.findMany({
      where: { createdAt: within },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { flat: { select: { code: true } }, user: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.emergencyAlert.count({ where: { createdAt: within } }),
    prisma.emergencyAlert.count({ where: { status: { in: ["TRIGGERED", "ACKNOWLEDGED"] } } }),
  ]);

  const deliveriesByStatus = deliveryEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.status] = (acc[event.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    window: {
      from: from.toISOString(),
      to: to.toISOString(),
      hours: Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 10) / 10,
    },
    totals: {
      visitorEntries: visitorTotal,
      visitorIn,
      visitorOut,
      walkIns,
      deliveries,
      deliveryEvents: deliveryEventCount,
      staffEntries: staffEntryCount,
      emergencyAlerts: emergencyAlertCount,
    },
    activeAlerts,
    visitorEntries,
    deliveries: deliveryEvents,
    deliveriesByStatus,
    staffEntries,
    emergencyAlerts,
  };
}
