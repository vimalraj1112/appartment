-- CreateEnum
CREATE TYPE "FlatStatus" AS ENUM ('OCCUPIED', 'VACANT', 'BLOCKED');

-- CreateEnum
CREATE TYPE "OccupantRelation" AS ENUM ('OWNER', 'TENANT');

-- CreateTable
CREATE TABLE "Building" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "towerCode" TEXT,
    "floorsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "buildingId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flat" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "floorId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT,
    "areaSqft" INTEGER,
    "status" "FlatStatus" NOT NULL DEFAULT 'VACANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Flat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlatOccupant" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "flatId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "relation" "OccupantRelation" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "movedInAt" TIMESTAMP(3),
    "movedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlatOccupant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "flatId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "phone" TEXT,
    "age" INTEGER,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResidentDocument" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "flatId" UUID,
    "type" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "flatId" UUID,
    "invitedById" UUID,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Building_communityId_idx" ON "Building"("communityId");

-- CreateIndex
CREATE INDEX "Building_communityId_createdAt_idx" ON "Building"("communityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Building_communityId_name_key" ON "Building"("communityId", "name");

-- CreateIndex
CREATE INDEX "Floor_communityId_idx" ON "Floor"("communityId");

-- CreateIndex
CREATE INDEX "Floor_buildingId_idx" ON "Floor"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_buildingId_number_key" ON "Floor"("buildingId", "number");

-- CreateIndex
CREATE INDEX "Flat_communityId_idx" ON "Flat"("communityId");

-- CreateIndex
CREATE INDEX "Flat_communityId_status_idx" ON "Flat"("communityId", "status");

-- CreateIndex
CREATE INDEX "Flat_floorId_idx" ON "Flat"("floorId");

-- CreateIndex
CREATE UNIQUE INDEX "Flat_communityId_code_key" ON "Flat"("communityId", "code");

-- CreateIndex
CREATE INDEX "FlatOccupant_communityId_idx" ON "FlatOccupant"("communityId");

-- CreateIndex
CREATE INDEX "FlatOccupant_flatId_idx" ON "FlatOccupant"("flatId");

-- CreateIndex
CREATE INDEX "FlatOccupant_userId_idx" ON "FlatOccupant"("userId");

-- CreateIndex
CREATE INDEX "FamilyMember_communityId_idx" ON "FamilyMember"("communityId");

-- CreateIndex
CREATE INDEX "FamilyMember_flatId_idx" ON "FamilyMember"("flatId");

-- CreateIndex
CREATE INDEX "ResidentDocument_communityId_idx" ON "ResidentDocument"("communityId");

-- CreateIndex
CREATE INDEX "ResidentDocument_userId_idx" ON "ResidentDocument"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_communityId_idx" ON "Invitation"("communityId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_communityId_createdAt_idx" ON "Invitation"("communityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flat" ADD CONSTRAINT "Flat_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flat" ADD CONSTRAINT "Flat_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatOccupant" ADD CONSTRAINT "FlatOccupant_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatOccupant" ADD CONSTRAINT "FlatOccupant_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatOccupant" ADD CONSTRAINT "FlatOccupant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentDocument" ADD CONSTRAINT "ResidentDocument_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidentDocument" ADD CONSTRAINT "ResidentDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
