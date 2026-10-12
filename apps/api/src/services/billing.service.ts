import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/AppError.js";
import type { AuthContext } from "../tenant/context.js";
import { paginate, paginationMeta } from "../utils/pagination.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { writeAudit } from "./audit.service.js";
import { createNotification } from "./notification.service.js";
import { getPaymentProvider } from "./payment.provider.js";

const BILL_LIST_INCLUDE = {
  flat: { select: { id: true, code: true, type: true } },
  _count: { select: { payments: true } },
} as const;

const BILL_DETAIL_INCLUDE = {
  flat: { select: { id: true, code: true, type: true } },
  items: { orderBy: { createdAt: "asc" } },
  payments: {
    orderBy: { createdAt: "desc" },
    include: {
      receipt: true,
      paidBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} as const;

type BillRow = Prisma.MaintenanceBillGetPayload<{ include: typeof BILL_LIST_INCLUDE }>;

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

function periodFromDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Due on the 10th of the month following the billing period. */
function defaultDueDate(period: string): Date {
  const [yearPart, monthPart] = period.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  return new Date(Date.UTC(year, month, 10));
}

function currentPeriod(): string {
  return periodFromDate(new Date());
}

async function communityCurrency(): Promise<string> {
  const setting = await prisma.communitySetting.findFirst({ select: { currency: true } });
  return setting?.currency ?? "INR";
}

async function notifyAdmins(title: string, body: string, data: Record<string, unknown>) {
  const admins = await prisma.user.findMany({
    where: { role: "COMMUNITY_ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) => createNotification({ userId: admin.id, type: "BILLING", title, body, data })),
  );
}

async function notifyFlatOccupants(flatId: string, title: string, body: string, data: Record<string, unknown>) {
  const occupants = await prisma.flatOccupant.findMany({
    where: { flatId, movedOutAt: null },
    select: { userId: true },
  });
  await Promise.all(
    occupants.map((occupant) =>
      createNotification({ userId: occupant.userId, type: "BILLING", title, body, data }),
    ),
  );
}

function billScopeWhere(auth: AuthContext, flatIds: string[]): Prisma.MaintenanceBillWhereInput {
  if (isAdmin(auth)) return {};
  return { flatId: { in: flatIds } };
}

async function findVisibleBill(id: string, auth: AuthContext) {
  const scope: Prisma.MaintenanceBillWhereInput = isAdmin(auth)
    ? {}
    : { flatId: { in: await myFlatIds(auth.userId) } };
  const bill = await prisma.maintenanceBill.findFirst({
    where: { id, ...scope },
    include: BILL_DETAIL_INCLUDE,
  });
  if (!bill) throw AppError.notFound("We could not find that bill.");
  return bill;
}

async function successfulPaid(billId: string): Promise<number> {
  const paid = await prisma.payment.aggregate({
    where: { billId, status: "SUCCESS" },
    _sum: { amountInr: true },
  });
  return paid._sum.amountInr ?? 0;
}

async function recomputeBillStatus(billId: string): Promise<void> {
  const bill = await prisma.maintenanceBill.findFirst({ where: { id: billId } });
  if (!bill) return;
  const sum = await successfulPaid(billId);
  let status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" = "PENDING";
  if (bill.totalInr > 0 && sum >= bill.totalInr) status = "PAID";
  else if (sum > 0) status = "PARTIAL";
  else if (bill.dueDate < new Date()) status = "OVERDUE";
  await prisma.maintenanceBill.update({ where: { id: billId }, data: { status } });
}

async function nextReceiptNo(): Promise<string> {
  const count = await prisma.paymentReceipt.count();
  return `RCPT-${new Date().getUTCFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

// ---------- Maintenance config ----------

export async function listConfigs() {
  return prisma.maintenanceConfig.findMany({ orderBy: { flatType: "asc" } });
}

export async function upsertConfig(input: {
  flatType: string;
  baseInr: number;
  waterInr: number;
  parkingInr: number;
  lateFeeInr: number;
  graceDays: number;
}) {
  const existing = await prisma.maintenanceConfig.findFirst({ where: { flatType: input.flatType } });
  const config = existing
    ? await prisma.maintenanceConfig.update({
        where: { id: existing.id },
        data: {
          baseInr: input.baseInr,
          waterInr: input.waterInr,
          parkingInr: input.parkingInr,
          lateFeeInr: input.lateFeeInr,
          graceDays: input.graceDays,
        },
      })
    : await prisma.maintenanceConfig.create({
        data: {
          communityId: "",
          flatType: input.flatType,
          baseInr: input.baseInr,
          waterInr: input.waterInr,
          parkingInr: input.parkingInr,
          lateFeeInr: input.lateFeeInr,
          graceDays: input.graceDays,
        },
      });
  await writeAudit({
    action: "BILLING.CONFIG_UPSERT",
    resource: "MaintenanceConfig",
    resourceId: config.id,
    meta: { flatType: config.flatType },
  });
  return config;
}

// ---------- Bills ----------

export async function listBills(query: {
  period?: string;
  status?: string;
  flatId?: string;
  mine?: boolean;
  q?: string;
  page: number;
  limit: number;
}) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const flatIds = isAdmin(auth) ? [] : await myFlatIds(auth.userId);
  const where: Prisma.MaintenanceBillWhereInput = { ...billScopeWhere(auth, flatIds) };

  if (query.period) where.period = query.period;
  if (query.status) where.status = query.status as never;
  if (query.flatId) where.flatId = query.flatId;
  if (query.q) where.flat = { code: { contains: query.q, mode: "insensitive" } };

  const [total, rows] = await Promise.all([
    prisma.maintenanceBill.count({ where }),
    prisma.maintenanceBill.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: BILL_LIST_INCLUDE }),
  ]);

  return { items: rows as BillRow[], meta: paginationMeta(query.page, query.limit, total) };
}

export async function getBill(id: string) {
  const auth = authContextOrThrow();
  const bill = await findVisibleBill(id, auth);
  const paid = bill.payments
    .filter((payment) => payment.status === "SUCCESS")
    .reduce((sum, payment) => sum + payment.amountInr, 0);
  return { bill, paidInr: paid, dueInr: Math.max(0, bill.totalInr - paid) };
}

export async function generateBills(input: { period: string; dueDate?: Date; flatIds?: string[] }) {
  authContextOrThrow();
  const dueDate = input.dueDate ?? defaultDueDate(input.period);

  const flats = await prisma.flat.findMany({
    where: {
      deletedAt: null,
      ...(input.flatIds ? { id: { in: input.flatIds } } : {}),
    },
    select: { id: true, code: true, type: true },
  });

  const configs = await prisma.maintenanceConfig.findMany();
  const configByType = new Map(configs.map((config) => [config.flatType, config]));

  let created = 0;
  let skipped = 0;

  for (const flat of flats) {
    const existing = await prisma.maintenanceBill.findFirst({
      where: { flatId: flat.id, period: input.period },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    const config = flat.type ? configByType.get(flat.type) : undefined;
    if (!config) {
      skipped += 1;
      continue;
    }

    const items = [
      { label: "Maintenance", amountInr: config.baseInr },
      { label: "Water", amountInr: config.waterInr },
      { label: "Parking", amountInr: config.parkingInr },
    ].filter((item) => item.amountInr > 0);

    const totalInr = items.reduce((sum, item) => sum + item.amountInr, 0);
    if (totalInr <= 0) {
      skipped += 1;
      continue;
    }

    const createdBill = await prisma.maintenanceBill.create({
      data: {
        communityId: "",
        flatId: flat.id,
        period: input.period,
        totalInr,
        dueDate,
      },
      select: { id: true },
    });
    await prisma.maintenanceBillItem.createMany({
      data: items.map((item) => ({
        communityId: "",
        billId: createdBill.id,
        label: item.label,
        amountInr: item.amountInr,
      })),
    });
    created += 1;

    await notifyFlatOccupants(
      flat.id,
      "New maintenance bill",
      `Your bill for ${input.period} is ready (₹${totalInr}).`,
      { period: input.period, flatId: flat.id },
    );
  }

  await writeAudit({
    action: "BILLING.GENERATE",
    resource: "MaintenanceBill",
    meta: { period: input.period, created, skipped },
  });

  return { period: input.period, dueDate, created, skipped };
}

export async function markOverdueBills() {
  const now = new Date();
  const bills = await prisma.maintenanceBill.findMany({
    where: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { lt: now } },
    include: { items: true, flat: { select: { type: true } } },
  });

  let updated = 0;
  for (const bill of bills) {
    const typeConfig = bill.flat.type
      ? await prisma.maintenanceConfig.findFirst({ where: { flatType: bill.flat.type } })
      : null;
    const hasLateFee = bill.items.some((item) => item.label === "Late fee");

    if (typeConfig && typeConfig.lateFeeInr > 0 && !hasLateFee) {
      await prisma.maintenanceBill.update({
        where: { id: bill.id },
        data: { totalInr: bill.totalInr + typeConfig.lateFeeInr, status: "OVERDUE" },
      });
      await prisma.maintenanceBillItem.create({
        data: { communityId: "", billId: bill.id, label: "Late fee", amountInr: typeConfig.lateFeeInr },
      });
    } else {
      await prisma.maintenanceBill.update({ where: { id: bill.id }, data: { status: "OVERDUE" } });
    }
    updated += 1;
  }

  await writeAudit({ action: "BILLING.OVERDUE_SWEEP", resource: "MaintenanceBill", meta: { updated } });
  return { updated };
}

// ---------- Payments ----------

export async function payBill(billId: string, input: { amountInr?: number; provider?: string; idempotencyKey: string }) {
  const auth = authContextOrThrow();

  const existing = await prisma.payment.findFirst({
    where: { idempotencyKey: input.idempotencyKey },
    include: { receipt: true },
  });
  if (existing) {
    return { payment: existing, idempotent: true };
  }

  const bill = await findVisibleBill(billId, auth);
  if (bill.status === "PAID") {
    throw AppError.conflict("This bill is already fully paid.");
  }

  const paid = await successfulPaid(billId);
  const remaining = bill.totalInr - paid;
  const amountInr = input.amountInr ?? remaining;
  if (amountInr <= 0) throw AppError.validation("There is nothing left to pay on this bill.");
  if (amountInr > remaining) throw AppError.validation("That amount is more than the outstanding balance.");

  const providerName = (input.provider ?? "MOCK") as "MOCK" | "RAZORPAY" | "UPI";
  const adapterUsed = providerName === "RAZORPAY" ? getPaymentProvider() : null;

  const payment = await prisma.payment.create({
    data: {
      communityId: "",
      billId,
      amountInr,
      provider: providerName as never,
      status: "PROCESSING",
      idempotencyKey: input.idempotencyKey,
      paidById: auth.userId || null,
    },
  });

  const currency = await communityCurrency();
  const intent =
    adapterUsed && adapterUsed.name === "RAZORPAY"
      ? await adapterUsed.createIntent({
          amountInr,
          currency,
          reference: bill.period,
          idempotencyKey: input.idempotencyKey,
        })
      : providerName === "MOCK"
        ? await getPaymentProvider().createIntent({
            amountInr,
            currency,
            reference: bill.period,
            idempotencyKey: input.idempotencyKey,
          })
        : { providerRef: `upi_${input.idempotencyKey}`, status: "SUCCESS" as const };

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerRef: intent.providerRef || null,
      status: intent.status,
      failureReason: intent.failureReason ?? null,
    },
  });

  if (intent.status === "SUCCESS") {
    await recomputeBillStatus(billId);
    const receipt = await prisma.paymentReceipt.create({
      data: {
        communityId: "",
        paymentId: payment.id,
        receiptNo: await nextReceiptNo(),
      },
    });
    await notifyAdmins("Payment received", `₹${amountInr} received for ${bill.flat.code} (${bill.period}).`, {
      paymentId: payment.id,
      billId,
    });
    await writeAudit({
      action: "BILLING.PAYMENT_SUCCESS",
      resource: "Payment",
      resourceId: payment.id,
      meta: { billId, amountInr, provider: providerName },
    });
    return { payment: { ...updated, receipt }, idempotent: false };
  }

  await writeAudit({
    action: "BILLING.PAYMENT_ATTEMPT",
    resource: "Payment",
    resourceId: payment.id,
    meta: { billId, status: intent.status },
  });
  return { payment: updated, idempotent: false };
}

export async function listPayments(query: { status?: string; billId?: string; flatId?: string; page: number; limit: number }) {
  const auth = authContextOrThrow();
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.PaymentWhereInput = {};

  if (!isAdmin(auth)) {
    where.bill = { flatId: { in: await myFlatIds(auth.userId) } };
  } else if (query.flatId) {
    where.bill = { flatId: query.flatId };
  }
  if (query.status) where.status = query.status as never;
  if (query.billId) where.billId = query.billId;

  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        receipt: true,
        bill: { select: { id: true, period: true, totalInr: true, flat: { select: { code: true } } } },
        paidBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  return { items: rows, meta: paginationMeta(query.page, query.limit, total) };
}

export async function getPayment(id: string) {
  const auth = authContextOrThrow();
  const where: Prisma.PaymentWhereInput = { id };
  if (!isAdmin(auth)) where.bill = { flatId: { in: await myFlatIds(auth.userId) } };
  const payment = await prisma.payment.findFirst({
    where,
    include: {
      receipt: true,
      bill: { select: { id: true, period: true, totalInr: true, status: true, flat: { select: { code: true } } } },
      paidBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!payment) throw AppError.notFound("We could not find that payment.");
  return payment;
}

export async function recordManualPayment(input: {
  billId: string;
  amountInr: number;
  provider: string;
  note?: string;
}) {
  const auth = authContextOrThrow();
  const bill = await findVisibleBill(input.billId, auth);
  if (bill.status === "PAID") throw AppError.conflict("This bill is already fully paid.");

  const paid = await successfulPaid(bill.id);
  const remaining = bill.totalInr - paid;
  if (input.amountInr > remaining) throw AppError.validation("That amount is more than the outstanding balance.");

  const payment = await prisma.payment.create({
    data: {
      communityId: "",
      billId: bill.id,
      amountInr: input.amountInr,
      provider: input.provider as never,
      status: "SUCCESS",
      idempotencyKey: `manual_${bill.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      paidById: auth.userId || null,
      note: input.note ?? null,
    },
  });

  await recomputeBillStatus(bill.id);
  const receipt = await prisma.paymentReceipt.create({
    data: { communityId: "", paymentId: payment.id, receiptNo: await nextReceiptNo() },
  });

  await writeAudit({
    action: "BILLING.MANUAL_PAYMENT",
    resource: "Payment",
    resourceId: payment.id,
    meta: { billId: bill.id, amountInr: input.amountInr, provider: input.provider },
  });

  return { ...payment, receipt };
}

// ---------- Expenses ----------

export async function listExpenseCategories() {
  return prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
}

export async function createExpenseCategory(input: { name: string }) {
  const existing = await prisma.expenseCategory.findFirst({ where: { name: input.name } });
  if (existing) throw AppError.conflict("A category with that name already exists.");
  const category = await prisma.expenseCategory.create({ data: { communityId: "", name: input.name } });
  await writeAudit({ action: "BILLING.EXPENSE_CATEGORY_CREATE", resource: "ExpenseCategory", resourceId: category.id });
  return category;
}

export async function listExpenses(query: {
  categoryId?: string;
  from?: Date;
  to?: Date;
  q?: string;
  page: number;
  limit: number;
}) {
  const { skip, take } = paginate(query.page, query.limit);
  const where: Prisma.ExpenseWhereInput = {};
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.from || query.to) {
    where.spentAt = { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) };
  }
  if (query.q) where.title = { contains: query.q, mode: "insensitive" };

  const [total, rows] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      skip,
      take,
      orderBy: { spentAt: "desc" },
      include: { category: { select: { id: true, name: true } }, createdBy: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  return { items: rows, meta: paginationMeta(query.page, query.limit, total) };
}

export async function createExpense(input: {
  title: string;
  amountInr: number;
  categoryId?: string;
  vendor?: string;
  note?: string;
  spentAt?: Date;
}) {
  const auth = authContextOrThrow();
  if (input.categoryId) {
    const category = await prisma.expenseCategory.findFirst({ where: { id: input.categoryId } });
    if (!category) throw AppError.notFound("We could not find that category.");
  }
  const expense = await prisma.expense.create({
    data: {
      communityId: "",
      categoryId: input.categoryId ?? null,
      title: input.title,
      amountInr: input.amountInr,
      vendor: input.vendor ?? null,
      note: input.note ?? null,
      spentAt: input.spentAt ?? new Date(),
      createdById: auth.userId || null,
    },
  });
  await writeAudit({ action: "BILLING.EXPENSE_CREATE", resource: "Expense", resourceId: expense.id });
  return expense;
}

export async function updateExpense(id: string, input: {
  title?: string;
  amountInr?: number;
  categoryId?: string;
  vendor?: string;
  note?: string;
  spentAt?: Date;
}) {
  const existing = await prisma.expense.findFirst({ where: { id } });
  if (!existing) throw AppError.notFound("We could not find that expense.");
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.amountInr !== undefined ? { amountInr: input.amountInr } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.vendor !== undefined ? { vendor: input.vendor } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.spentAt !== undefined ? { spentAt: input.spentAt } : {}),
    },
  });
  await writeAudit({ action: "BILLING.EXPENSE_UPDATE", resource: "Expense", resourceId: id });
  return expense;
}

export async function deleteExpense(id: string) {
  const existing = await prisma.expense.findFirst({ where: { id } });
  if (!existing) throw AppError.notFound("We could not find that expense.");
  await prisma.expense.delete({ where: { id } });
  await writeAudit({ action: "BILLING.EXPENSE_DELETE", resource: "Expense", resourceId: id });
  return { id, deleted: true };
}

// ---------- Summary ----------

export async function getFinanceSummary(query: { period?: string } = {}) {
  const period = query.period ?? currentPeriod();
  const bills = await prisma.maintenanceBill.findMany({
    where: { period },
    select: { id: true, totalInr: true, status: true },
  });
  const billIds = bills.map((bill) => bill.id);

  const collected = await prisma.payment.aggregate({
    where: { billId: { in: billIds }, status: "SUCCESS" },
    _sum: { amountInr: true },
  });

  const billed = bills.reduce((sum, bill) => sum + bill.totalInr, 0);
  const collectedInr = collected._sum.amountInr ?? 0;

  const expenses = await prisma.expense.aggregate({
    _sum: { amountInr: true },
  });

  return {
    period,
    bills: bills.length,
    billedInr: billed,
    collectedInr,
    outstandingInr: Math.max(0, billed - collectedInr),
    paidBills: bills.filter((bill) => bill.status === "PAID").length,
    overdueBills: bills.filter((bill) => bill.status === "OVERDUE").length,
    totalExpensesInr: expenses._sum.amountInr ?? 0,
  };
}
