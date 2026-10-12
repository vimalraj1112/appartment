-- CreateEnum
CREATE TYPE "VisitorPassType" AS ENUM ('SINGLE_USE', 'TIME_WINDOW');

-- CreateEnum
CREATE TYPE "VisitorPassStatus" AS ENUM ('PENDING', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitorEntryDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "VisitorEntryMethod" AS ENUM ('QR', 'WALK_IN', 'MANUAL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('EXPECTED', 'ARRIVED', 'DELIVERED', 'COLLECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WatchlistType" AS ENUM ('PERSON', 'VEHICLE');

-- CreateTable
CREATE TABLE "Visitor" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "flatId" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "purpose" TEXT,
    "photoUrl" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorPass" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "visitorId" UUID NOT NULL,
    "flatId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "qrTokenHash" TEXT NOT NULL,
    "type" "VisitorPassType" NOT NULL DEFAULT 'SINGLE_USE',
    "status" "VisitorPassStatus" NOT NULL DEFAULT 'PENDING',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdById" UUID,
    "approvedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorEntry" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "passId" UUID,
    "visitorId" UUID NOT NULL,
    "direction" "VisitorEntryDirection" NOT NULL,
    "method" "VisitorEntryMethod" NOT NULL,
    "guardUserId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "flatId" UUID,
    "category" TEXT NOT NULL,
    "company" TEXT,
    "personName" TEXT,
    "phone" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'EXPECTED',
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryEntry" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "guardUserId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistEntry" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "type" "WatchlistType" NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT,
    "reason" TEXT NOT NULL,
    "flaggedById" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visitor_communityId_idx" ON "Visitor"("communityId");

-- CreateIndex
CREATE INDEX "Visitor_communityId_flatId_idx" ON "Visitor"("communityId", "flatId");

-- CreateIndex
CREATE INDEX "Visitor_phone_idx" ON "Visitor"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorPass_qrTokenHash_key" ON "VisitorPass"("qrTokenHash");

-- CreateIndex
CREATE INDEX "VisitorPass_communityId_idx" ON "VisitorPass"("communityId");

-- CreateIndex
CREATE INDEX "VisitorPass_communityId_status_idx" ON "VisitorPass"("communityId", "status");

-- CreateIndex
CREATE INDEX "VisitorPass_flatId_idx" ON "VisitorPass"("flatId");

-- CreateIndex
CREATE INDEX "VisitorPass_communityId_createdAt_idx" ON "VisitorPass"("communityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorPass_communityId_code_key" ON "VisitorPass"("communityId", "code");

-- CreateIndex
CREATE INDEX "VisitorEntry_communityId_idx" ON "VisitorEntry"("communityId");

-- CreateIndex
CREATE INDEX "VisitorEntry_communityId_createdAt_idx" ON "VisitorEntry"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "VisitorEntry_passId_idx" ON "VisitorEntry"("passId");

-- CreateIndex
CREATE INDEX "Delivery_communityId_idx" ON "Delivery"("communityId");

-- CreateIndex
CREATE INDEX "Delivery_communityId_status_idx" ON "Delivery"("communityId", "status");

-- CreateIndex
CREATE INDEX "Delivery_flatId_idx" ON "Delivery"("flatId");

-- CreateIndex
CREATE INDEX "Delivery_communityId_createdAt_idx" ON "Delivery"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryEntry_communityId_idx" ON "DeliveryEntry"("communityId");

-- CreateIndex
CREATE INDEX "DeliveryEntry_deliveryId_idx" ON "DeliveryEntry"("deliveryId");

-- CreateIndex
CREATE INDEX "WatchlistEntry_communityId_idx" ON "WatchlistEntry"("communityId");

-- CreateIndex
CREATE INDEX "WatchlistEntry_communityId_type_idx" ON "WatchlistEntry"("communityId", "type");

-- CreateIndex
CREATE INDEX "WatchlistEntry_value_idx" ON "WatchlistEntry"("value");

-- CreateIndex
CREATE INDEX "WatchlistEntry_communityId_createdAt_idx" ON "WatchlistEntry"("communityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorPass" ADD CONSTRAINT "VisitorPass_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorPass" ADD CONSTRAINT "VisitorPass_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorPass" ADD CONSTRAINT "VisitorPass_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorPass" ADD CONSTRAINT "VisitorPass_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorPass" ADD CONSTRAINT "VisitorPass_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorEntry" ADD CONSTRAINT "VisitorEntry_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorEntry" ADD CONSTRAINT "VisitorEntry_passId_fkey" FOREIGN KEY ("passId") REFERENCES "VisitorPass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorEntry" ADD CONSTRAINT "VisitorEntry_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorEntry" ADD CONSTRAINT "VisitorEntry_guardUserId_fkey" FOREIGN KEY ("guardUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEntry" ADD CONSTRAINT "DeliveryEntry_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEntry" ADD CONSTRAINT "DeliveryEntry_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEntry" ADD CONSTRAINT "DeliveryEntry_guardUserId_fkey" FOREIGN KEY ("guardUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistEntry" ADD CONSTRAINT "WatchlistEntry_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistEntry" ADD CONSTRAINT "WatchlistEntry_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
