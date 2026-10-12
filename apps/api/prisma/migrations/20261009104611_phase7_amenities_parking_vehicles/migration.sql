-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('BOOKED', 'CANCELLED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'BIKE', 'EV', 'BICYCLE');

-- CreateEnum
CREATE TYPE "ParkingSlotStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "Amenity" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "slotMinutes" INTEGER NOT NULL DEFAULT 60,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "openTime" TEXT NOT NULL DEFAULT '06:00',
    "closeTime" TEXT NOT NULL DEFAULT '22:00',
    "feeInr" INTEGER NOT NULL DEFAULT 0,
    "rules" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmenityBooking" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "amenityId" UUID NOT NULL,
    "flatId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,
    "slotEnd" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED',
    "guests" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "waitlistPosition" INTEGER,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmenityBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "flatId" UUID,
    "regNumber" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL DEFAULT 'CAR',
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "guestExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkingSlot" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "zone" TEXT,
    "status" "ParkingSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkingAssignment" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "flatId" UUID,
    "vehicleId" UUID,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkingVisitor" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "slotId" UUID,
    "regNumber" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "note" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Amenity_communityId_idx" ON "Amenity"("communityId");

-- CreateIndex
CREATE INDEX "Amenity_communityId_isActive_idx" ON "Amenity"("communityId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_communityId_name_key" ON "Amenity"("communityId", "name");

-- CreateIndex
CREATE INDEX "AmenityBooking_communityId_idx" ON "AmenityBooking"("communityId");

-- CreateIndex
CREATE INDEX "AmenityBooking_communityId_status_idx" ON "AmenityBooking"("communityId", "status");

-- CreateIndex
CREATE INDEX "AmenityBooking_amenityId_date_idx" ON "AmenityBooking"("amenityId", "date");

-- CreateIndex
CREATE INDEX "AmenityBooking_flatId_idx" ON "AmenityBooking"("flatId");

-- CreateIndex
CREATE INDEX "AmenityBooking_communityId_createdAt_idx" ON "AmenityBooking"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "Vehicle_communityId_idx" ON "Vehicle"("communityId");

-- CreateIndex
CREATE INDEX "Vehicle_communityId_type_idx" ON "Vehicle"("communityId", "type");

-- CreateIndex
CREATE INDEX "Vehicle_userId_idx" ON "Vehicle"("userId");

-- CreateIndex
CREATE INDEX "Vehicle_flatId_idx" ON "Vehicle"("flatId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_communityId_regNumber_key" ON "Vehicle"("communityId", "regNumber");

-- CreateIndex
CREATE INDEX "ParkingSlot_communityId_idx" ON "ParkingSlot"("communityId");

-- CreateIndex
CREATE INDEX "ParkingSlot_communityId_status_idx" ON "ParkingSlot"("communityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingSlot_communityId_code_key" ON "ParkingSlot"("communityId", "code");

-- CreateIndex
CREATE INDEX "ParkingAssignment_communityId_idx" ON "ParkingAssignment"("communityId");

-- CreateIndex
CREATE INDEX "ParkingAssignment_slotId_idx" ON "ParkingAssignment"("slotId");

-- CreateIndex
CREATE INDEX "ParkingAssignment_flatId_idx" ON "ParkingAssignment"("flatId");

-- CreateIndex
CREATE INDEX "ParkingAssignment_communityId_createdAt_idx" ON "ParkingAssignment"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "ParkingVisitor_communityId_idx" ON "ParkingVisitor"("communityId");

-- CreateIndex
CREATE INDEX "ParkingVisitor_communityId_createdAt_idx" ON "ParkingVisitor"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "ParkingVisitor_regNumber_idx" ON "ParkingVisitor"("regNumber");

-- AddForeignKey
ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmenityBooking" ADD CONSTRAINT "AmenityBooking_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmenityBooking" ADD CONSTRAINT "AmenityBooking_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmenityBooking" ADD CONSTRAINT "AmenityBooking_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmenityBooking" ADD CONSTRAINT "AmenityBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingSlot" ADD CONSTRAINT "ParkingSlot_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAssignment" ADD CONSTRAINT "ParkingAssignment_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAssignment" ADD CONSTRAINT "ParkingAssignment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ParkingSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAssignment" ADD CONSTRAINT "ParkingAssignment_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAssignment" ADD CONSTRAINT "ParkingAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingVisitor" ADD CONSTRAINT "ParkingVisitor_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingVisitor" ADD CONSTRAINT "ParkingVisitor_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ParkingSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingVisitor" ADD CONSTRAINT "ParkingVisitor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
