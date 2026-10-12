import { z } from "zod";
import {
  BILL_PERIOD_PATTERN,
  BILL_STATUSES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
} from "../enums.js";

export const maintenanceConfigUpsertSchema = z.object({
  flatType: z.string().trim().min(1, "Flat type is required").max(40),
  baseInr: z.coerce.number().int().min(0).max(10_000_000).default(0),
  waterInr: z.coerce.number().int().min(0).max(10_000_000).default(0),
  parkingInr: z.coerce.number().int().min(0).max(10_000_000).default(0),
  lateFeeInr: z.coerce.number().int().min(0).max(10_000_000).default(0),
  graceDays: z.coerce.number().int().min(0).max(90).default(5),
});
export type MaintenanceConfigUpsertInput = z.infer<typeof maintenanceConfigUpsertSchema>;

export const billGenerateSchema = z.object({
  period: z.string().regex(BILL_PERIOD_PATTERN, "Period must be formatted as YYYY-MM"),
  dueDate: z.coerce.date().optional(),
  flatIds: z.array(z.string().uuid()).max(500).optional(),
});
export type BillGenerateInput = z.infer<typeof billGenerateSchema>;

export const billListQuerySchema = z.object({
  period: z.string().trim().max(7).optional(),
  status: z.enum(BILL_STATUSES).optional(),
  flatId: z.string().uuid().optional(),
  mine: z.coerce.boolean().optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type BillListQuery = z.infer<typeof billListQuerySchema>;

export const paymentCreateSchema = z.object({
  amountInr: z.coerce.number().int().min(1).max(10_000_000).optional(),
  provider: z.enum(["MOCK", "RAZORPAY", "UPI"]).default("MOCK"),
  idempotencyKey: z.string().trim().min(8).max(120),
});
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;

export const manualPaymentCreateSchema = z.object({
  billId: z.string().uuid(),
  amountInr: z.coerce.number().int().min(1).max(10_000_000),
  provider: z.enum(["CASH", "BANK_TRANSFER", "UPI"]).default("CASH"),
  note: z.string().trim().max(300).optional(),
});
export type ManualPaymentCreateInput = z.infer<typeof manualPaymentCreateSchema>;

export const paymentListQuerySchema = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  billId: z.string().uuid().optional(),
  flatId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;

export const expenseCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(60),
});
export type ExpenseCategoryCreateInput = z.infer<typeof expenseCategoryCreateSchema>;

export const expenseCreateSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  amountInr: z.coerce.number().int().min(1).max(100_000_000),
  categoryId: z.string().uuid().optional(),
  vendor: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  spentAt: z.coerce.date().optional(),
});
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;

export const expenseUpdateSchema = expenseCreateSchema.partial();
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;

export const expenseListQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;

export { PAYMENT_PROVIDERS, PAYMENT_STATUSES, BILL_STATUSES };
