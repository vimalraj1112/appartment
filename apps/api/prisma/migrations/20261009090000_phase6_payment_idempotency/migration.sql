-- DropIndex
DROP INDEX "Payment_idempotencyKey_key";

-- CreateIndex
CREATE UNIQUE INDEX "Payment_communityId_idempotencyKey_key" ON "Payment"("communityId", "idempotencyKey");
