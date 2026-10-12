-- DropIndex
DROP INDEX "PaymentReceipt_receiptNo_key";

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_communityId_receiptNo_key" ON "PaymentReceipt"("communityId", "receiptNo");
