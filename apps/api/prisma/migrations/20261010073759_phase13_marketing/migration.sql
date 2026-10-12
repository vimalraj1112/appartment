-- CreateEnum
CREATE TYPE "DemoLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "DemoLead" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "communityName" TEXT NOT NULL,
    "flats" INTEGER,
    "message" TEXT,
    "status" "DemoLeadStatus" NOT NULL DEFAULT 'NEW',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoLead_status_createdAt_idx" ON "DemoLead"("status", "createdAt");
