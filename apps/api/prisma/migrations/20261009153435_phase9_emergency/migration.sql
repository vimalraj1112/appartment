-- CreateEnum
CREATE TYPE "EmergencyCategory" AS ENUM ('MEDICAL', 'FIRE', 'SECURITY', 'ELECTRICAL', 'WATER', 'OTHER');

-- CreateEnum
CREATE TYPE "EmergencyAlertStatus" AS ENUM ('TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "EmergencyAlert" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "flatId" UUID,
    "userId" UUID NOT NULL,
    "category" "EmergencyCategory" NOT NULL,
    "status" "EmergencyAlertStatus" NOT NULL DEFAULT 'TRIGGERED',
    "note" TEXT,
    "acknowledgedById" UUID,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyAlert_communityId_idx" ON "EmergencyAlert"("communityId");

-- CreateIndex
CREATE INDEX "EmergencyAlert_communityId_status_idx" ON "EmergencyAlert"("communityId", "status");

-- CreateIndex
CREATE INDEX "EmergencyAlert_flatId_idx" ON "EmergencyAlert"("flatId");

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
