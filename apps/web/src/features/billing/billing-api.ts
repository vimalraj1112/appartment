import type { BillStatus, PaymentProvider, PaymentStatus } from "@superlink/shared";
import { apiRequest, apiRequestPage, type Page } from "../../lib/api";

export interface MaintenanceConfig {
  id: string;
  flatType: string;
  baseInr: number;
  waterInr: number;
  parkingInr: number;
  lateFeeInr: number;
  graceDays: number;
}

export interface BillFlat {
  id: string;
  code: string;
  type: string;
}

export interface MaintenanceBill {
  id: string;
  flatId: string;
  period: string;
  totalInr: number;
  status: BillStatus;
  dueDate: string;
  createdAt: string;
  flat: BillFlat;
  _count?: { payments: number };
}

export interface BillItem {
  id: string;
  label: string;
  amountInr: number;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  issuedAt: string;
}

export interface PaymentUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Payment {
  id: string;
  billId: string;
  amountInr: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerRef: string | null;
  failureReason: string | null;
  note: string | null;
  createdAt: string;
  receipt: Receipt | null;
  paidBy: PaymentUser | null;
  bill?: {
    id: string;
    period: string;
    totalInr: number;
    status?: BillStatus;
    flat: { code: string };
  };
}

export interface BillDetailBill extends MaintenanceBill {
  items: BillItem[];
  payments: Payment[];
}

export interface BillDetail {
  bill: BillDetailBill;
  paidInr: number;
  dueInr: number;
}

export interface FinanceSummary {
  period: string;
  bills: number;
  billedInr: number;
  collectedInr: number;
  outstandingInr: number;
  paidBills: number;
  overdueBills: number;
  totalExpensesInr: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  title: string;
  amountInr: number;
  vendor: string | null;
  note: string | null;
  spentAt: string;
  createdAt: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  createdBy: PaymentUser | null;
}

// ---------- Config ----------

export function listConfigs(): Promise<MaintenanceConfig[]> {
  return apiRequest<MaintenanceConfig[]>("/billing/config");
}

export function upsertConfig(body: {
  flatType: string;
  baseInr?: number;
  waterInr?: number;
  parkingInr?: number;
  lateFeeInr?: number;
  graceDays?: number;
}): Promise<MaintenanceConfig> {
  return apiRequest<MaintenanceConfig>("/billing/config", { method: "PUT", body });
}

// ---------- Bills ----------

export function listBills(
  params: {
    period?: string;
    status?: BillStatus;
    flatId?: string;
    mine?: boolean;
    q?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<Page<MaintenanceBill>> {
  const search = new URLSearchParams();
  if (params.period) search.set("period", params.period);
  if (params.status) search.set("status", params.status);
  if (params.flatId) search.set("flatId", params.flatId);
  if (params.mine) search.set("mine", "true");
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<MaintenanceBill>(`/billing/bills?${search.toString()}`);
}

export function getBill(id: string): Promise<BillDetail> {
  return apiRequest<BillDetail>(`/billing/bills/${id}`);
}

export function generateBills(body: {
  period: string;
  dueDate?: string;
  flatIds?: string[];
}): Promise<{ period: string; dueDate: string; created: number; skipped: number }> {
  return apiRequest("/billing/bills/generate", { method: "POST", body });
}

export function markOverdue(): Promise<{ updated: number }> {
  return apiRequest("/billing/bills/overdue", { method: "POST" });
}

export function payBill(
  id: string,
  body: { amountInr?: number; provider?: "MOCK" | "RAZORPAY" | "UPI"; idempotencyKey: string },
): Promise<{ payment: Payment; idempotent: boolean }> {
  return apiRequest<{ payment: Payment; idempotent: boolean }>(`/billing/bills/${id}/pay`, {
    method: "POST",
    body,
  });
}

// ---------- Payments ----------

export function listPayments(
  params: { status?: PaymentStatus; billId?: string; flatId?: string; page?: number; limit?: number } = {},
): Promise<Page<Payment>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.billId) search.set("billId", params.billId);
  if (params.flatId) search.set("flatId", params.flatId);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<Payment>(`/payments?${search.toString()}`);
}

export function getPayment(id: string): Promise<Payment> {
  return apiRequest<Payment>(`/payments/${id}`);
}

export function recordManualPayment(body: {
  billId: string;
  amountInr: number;
  provider?: "CASH" | "BANK_TRANSFER" | "UPI";
  note?: string;
}): Promise<Payment> {
  return apiRequest<Payment>("/payments/manual", { method: "POST", body });
}

export function getFinanceSummary(period?: string): Promise<FinanceSummary> {
  const suffix = period ? `?period=${period}` : "";
  return apiRequest<FinanceSummary>(`/billing/summary${suffix}`);
}

// ---------- Expenses ----------

export function listExpenseCategories(): Promise<ExpenseCategory[]> {
  return apiRequest<ExpenseCategory[]>("/expenses/categories");
}

export function createExpenseCategory(body: { name: string }): Promise<ExpenseCategory> {
  return apiRequest<ExpenseCategory>("/expenses/categories", { method: "POST", body });
}

export function listExpenses(
  params: { categoryId?: string; from?: string; to?: string; q?: string; page?: number; limit?: number } = {},
): Promise<Page<Expense>> {
  const search = new URLSearchParams();
  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 50));
  return apiRequestPage<Expense>(`/expenses?${search.toString()}`);
}

export function createExpense(body: {
  title: string;
  amountInr: number;
  categoryId?: string;
  vendor?: string;
  note?: string;
  spentAt?: string;
}): Promise<Expense> {
  return apiRequest<Expense>("/expenses", { method: "POST", body });
}

export function updateExpense(
  id: string,
  body: Partial<{
    title: string;
    amountInr: number;
    categoryId: string | null;
    vendor: string | null;
    note: string | null;
    spentAt: string;
  }>,
): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}`, { method: "PATCH", body });
}

export function deleteExpense(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/expenses/${id}`, { method: "DELETE" });
}
