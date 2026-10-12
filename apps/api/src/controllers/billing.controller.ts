import type { Request, Response } from "express";
import * as billingService from "../services/billing.service.js";
import { ok } from "../utils/respond.js";

// ---------- Maintenance config ----------

export async function listConfigs(_req: Request, res: Response): Promise<void> {
  ok(res, await billingService.listConfigs());
}

export async function upsertConfig(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    flatType: string;
    baseInr: number;
    waterInr: number;
    parkingInr: number;
    lateFeeInr: number;
    graceDays: number;
  };
  ok(res, await billingService.upsertConfig(body));
}

// ---------- Bills ----------

export async function listBills(req: Request, res: Response): Promise<void> {
  const result = await billingService.listBills(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function getBill(req: Request, res: Response): Promise<void> {
  ok(res, await billingService.getBill(req.params.id as string));
}

export async function generateBills(req: Request, res: Response): Promise<void> {
  const body = req.body as { period: string; dueDate?: Date; flatIds?: string[] };
  ok(res, await billingService.generateBills(body));
}

export async function markOverdue(_req: Request, res: Response): Promise<void> {
  ok(res, await billingService.markOverdueBills());
}

export async function financeSummary(req: Request, res: Response): Promise<void> {
  ok(res, await billingService.getFinanceSummary({ period: req.query.period as string | undefined }));
}

// ---------- Payments ----------

export async function payBill(req: Request, res: Response): Promise<void> {
  const body = req.body as { amountInr?: number; provider?: string; idempotencyKey: string };
  ok(res, await billingService.payBill(req.params.id as string, body));
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  const result = await billingService.listPayments(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  ok(res, await billingService.getPayment(req.params.id as string));
}

export async function recordManualPayment(req: Request, res: Response): Promise<void> {
  const body = req.body as { billId: string; amountInr: number; provider: string; note?: string };
  ok(res, await billingService.recordManualPayment(body));
}

// ---------- Expenses ----------

export async function listExpenseCategories(_req: Request, res: Response): Promise<void> {
  ok(res, await billingService.listExpenseCategories());
}

export async function createExpenseCategory(req: Request, res: Response): Promise<void> {
  ok(res, await billingService.createExpenseCategory(req.body as { name: string }));
}

export async function listExpenses(req: Request, res: Response): Promise<void> {
  const result = await billingService.listExpenses(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  ok(res, await billingService.createExpense(req.body as never));
}

export async function updateExpense(req: Request, res: Response): Promise<void> {
  ok(res, await billingService.updateExpense(req.params.id as string, req.body as never));
}

export async function deleteExpense(req: Request, res: Response): Promise<void> {
  ok(res, await billingService.deleteExpense(req.params.id as string));
}
