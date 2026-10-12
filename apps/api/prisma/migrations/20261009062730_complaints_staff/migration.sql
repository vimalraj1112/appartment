-- CreateEnum
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "StaffAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'OFF');

-- CreateEnum
CREATE TYPE "DomesticStaffStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "ComplaintCategory" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slaHours" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplaintCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "flatId" UUID,
    "raisedById" UUID NOT NULL,
    "categoryId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "ComplaintPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" UUID,
    "location" TEXT,
    "rating" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintComment" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "trade" TEXT NOT NULL,
    "availability" "StaffAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "complaintId" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "assignedById" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffEntry" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "staffUserId" UUID NOT NULL,
    "direction" "VisitorEntryDirection" NOT NULL,
    "guardUserId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomesticStaff" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "flatId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "photoUrl" TEXT,
    "idInfo" TEXT,
    "workType" TEXT NOT NULL,
    "status" "DomesticStaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomesticStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplaintCategory_communityId_idx" ON "ComplaintCategory"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintCategory_communityId_name_key" ON "ComplaintCategory"("communityId", "name");

-- CreateIndex
CREATE INDEX "Complaint_communityId_idx" ON "Complaint"("communityId");

-- CreateIndex
CREATE INDEX "Complaint_communityId_status_idx" ON "Complaint"("communityId", "status");

-- CreateIndex
CREATE INDEX "Complaint_communityId_assignedToId_idx" ON "Complaint"("communityId", "assignedToId");

-- CreateIndex
CREATE INDEX "Complaint_flatId_idx" ON "Complaint"("flatId");

-- CreateIndex
CREATE INDEX "Complaint_communityId_createdAt_idx" ON "Complaint"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplaintComment_communityId_idx" ON "ComplaintComment"("communityId");

-- CreateIndex
CREATE INDEX "ComplaintComment_complaintId_idx" ON "ComplaintComment"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");

-- CreateIndex
CREATE INDEX "StaffProfile_communityId_idx" ON "StaffProfile"("communityId");

-- CreateIndex
CREATE INDEX "StaffProfile_communityId_trade_idx" ON "StaffProfile"("communityId", "trade");

-- CreateIndex
CREATE INDEX "StaffAssignment_communityId_idx" ON "StaffAssignment"("communityId");

-- CreateIndex
CREATE INDEX "StaffAssignment_complaintId_idx" ON "StaffAssignment"("complaintId");

-- CreateIndex
CREATE INDEX "StaffAssignment_staffUserId_idx" ON "StaffAssignment"("staffUserId");

-- CreateIndex
CREATE INDEX "StaffEntry_communityId_idx" ON "StaffEntry"("communityId");

-- CreateIndex
CREATE INDEX "StaffEntry_communityId_createdAt_idx" ON "StaffEntry"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffEntry_staffUserId_idx" ON "StaffEntry"("staffUserId");

-- CreateIndex
CREATE INDEX "DomesticStaff_communityId_idx" ON "DomesticStaff"("communityId");

-- CreateIndex
CREATE INDEX "DomesticStaff_flatId_idx" ON "DomesticStaff"("flatId");

-- CreateIndex
CREATE INDEX "DomesticStaff_communityId_status_idx" ON "DomesticStaff"("communityId", "status");

-- AddForeignKey
ALTER TABLE "ComplaintCategory" ADD CONSTRAINT "ComplaintCategory_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ComplaintCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintComment" ADD CONSTRAINT "ComplaintComment_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintComment" ADD CONSTRAINT "ComplaintComment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintComment" ADD CONSTRAINT "ComplaintComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffEntry" ADD CONSTRAINT "StaffEntry_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffEntry" ADD CONSTRAINT "StaffEntry_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffEntry" ADD CONSTRAINT "StaffEntry_guardUserId_fkey" FOREIGN KEY ("guardUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomesticStaff" ADD CONSTRAINT "DomesticStaff_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomesticStaff" ADD CONSTRAINT "DomesticStaff_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
