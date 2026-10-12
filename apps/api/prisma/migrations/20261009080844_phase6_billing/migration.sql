-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MOCK', 'RAZORPAY', 'CASH', 'BANK_TRANSFER', 'UPI');

-- CreateTable
CREATE TABLE "MaintenanceConfig" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "flatType" TEXT NOT NULL,
    "baseInr" INTEGER NOT NULL DEFAULT 0,
    "waterInr" INTEGER NOT NULL DEFAULT 0,
    "parkingInr" INTEGER NOT NULL DEFAULT 0,
    "lateFeeInr" INTEGER NOT NULL DEFAULT 0,
    "graceDays" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceBill" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "flatId" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "totalInr" INTEGER NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceBillItem" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceBillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MOCK',
    "providerRef" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "paidById" UUID,
    "note" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "fileKey" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "categoryId" UUID,
    "title" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "vendor" TEXT,
    "note" TEXT,
    "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceConfig_communityId_idx" ON "MaintenanceConfig"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceConfig_communityId_flatType_key" ON "MaintenanceConfig"("communityId", "flatType");

-- CreateIndex
CREATE INDEX "MaintenanceBill_communityId_idx" ON "MaintenanceBill"("communityId");

-- CreateIndex
CREATE INDEX "MaintenanceBill_communityId_status_idx" ON "MaintenanceBill"("communityId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceBill_communityId_period_idx" ON "MaintenanceBill"("communityId", "period");

-- CreateIndex
CREATE INDEX "MaintenanceBill_flatId_idx" ON "MaintenanceBill"("flatId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceBill_flatId_period_key" ON "MaintenanceBill"("flatId", "period");

-- CreateIndex
CREATE INDEX "MaintenanceBillItem_communityId_idx" ON "MaintenanceBillItem"("communityId");

-- CreateIndex
CREATE INDEX "MaintenanceBillItem_billId_idx" ON "MaintenanceBillItem"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_communityId_idx" ON "Payment"("communityId");

-- CreateIndex
CREATE INDEX "Payment_communityId_status_idx" ON "Payment"("communityId", "status");

-- CreateIndex
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");

-- CreateIndex
CREATE INDEX "Payment_communityId_createdAt_idx" ON "Payment"("communityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_paymentId_key" ON "PaymentReceipt"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_receiptNo_key" ON "PaymentReceipt"("receiptNo");

-- CreateIndex
CREATE INDEX "PaymentReceipt_communityId_idx" ON "PaymentReceipt"("communityId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_communityId_idx" ON "ExpenseCategory"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_communityId_name_key" ON "ExpenseCategory"("communityId", "name");

-- CreateIndex
CREATE INDEX "Expense_communityId_idx" ON "Expense"("communityId");

-- CreateIndex
CREATE INDEX "Expense_communityId_spentAt_idx" ON "Expense"("communityId", "spentAt");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- AddForeignKey
ALTER TABLE "MaintenanceConfig" ADD CONSTRAINT "MaintenanceConfig_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceBill" ADD CONSTRAINT "MaintenanceBill_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceBill" ADD CONSTRAINT "MaintenanceBill_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceBillItem" ADD CONSTRAINT "MaintenanceBillItem_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceBillItem" ADD CONSTRAINT "MaintenanceBillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "MaintenanceBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "MaintenanceBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
