import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEV_PASSWORD = "Password123!";

async function upsertUser(input: {
  email: string;
  role: "SUPER_ADMIN" | "COMMUNITY_ADMIN" | "SECURITY" | "RESIDENT" | "STAFF";
  firstName: string;
  lastName: string;
  communityId?: string | null;
  phone?: string;
}) {
  const passwordHash = await argon2.hash(DEV_PASSWORD);
  return prisma.user.upsert({
    where: { email: input.email },
    update: { role: input.role, firstName: input.firstName, lastName: input.lastName },
    create: {
      email: input.email,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      communityId: input.communityId ?? null,
      phone: input.phone ?? null,
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
}

async function main() {
  await upsertUser({
    email: "super@superlink.dev",
    role: "SUPER_ADMIN",
    firstName: "Platform",
    lastName: "Admin",
  });

  const community = await prisma.community.upsert({
    where: { slug: "green-valley-residency" },
    update: { name: "Green Valley Residency" },
    create: {
      name: "Green Valley Residency",
      slug: "green-valley-residency",
      address: "Survey No. 42, Kondapur Main Road",
      city: "Hyderabad",
      state: "Telangana",
      timezone: "Asia/Kolkata",
      status: "ACTIVE",
    },
  });

  await prisma.communitySetting.upsert({
    where: { communityId: community.id },
    update: {},
    create: { communityId: community.id, currency: "INR" },
  });

  const plan = await prisma.subscriptionPlan.upsert({
    where: { code: "founder" },
    update: {},
    create: {
      code: "founder",
      name: "Founder Plan",
      priceMonthlyInr: 4999,
      flatLimit: 500,
      features: { aiAssistant: true, analytics: true },
    },
  });

  await prisma.subscription.upsert({
    where: { communityId: community.id },
    update: {},
    create: {
      communityId: community.id,
      planId: plan.id,
      status: "TRIAL",
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const admin = await upsertUser({
    email: "admin@greenvalley.dev",
    role: "COMMUNITY_ADMIN",
    firstName: "Ramesh",
    lastName: "Nair",
    communityId: community.id,
    phone: "+919810012345",
  });

  const guard = await upsertUser({
    email: "security@greenvalley.dev",
    role: "SECURITY",
    firstName: "Suresh",
    lastName: "Kumar",
    communityId: community.id,
    phone: "+919810023456",
  });

  const staff = await upsertUser({
    email: "staff@greenvalley.dev",
    role: "STAFF",
    firstName: "Mohan",
    lastName: "Reddy",
    communityId: community.id,
    phone: "+919810034567",
  });

  const resident = await upsertUser({
    email: "resident@greenvalley.dev",
    role: "RESIDENT",
    firstName: "Vimal",
    lastName: "Menon",
    communityId: community.id,
    phone: "+919810045678",
  });

  const building = await prisma.building.upsert({
    where: { communityId_name: { communityId: community.id, name: "Tower A" } },
    update: { towerCode: "A", floorsCount: 3 },
    create: { communityId: community.id, name: "Tower A", towerCode: "A", floorsCount: 3 },
  });

  const flatIds: string[] = [];
  for (let floorNumber = 1; floorNumber <= 3; floorNumber += 1) {
    const floor = await prisma.floor.upsert({
      where: { buildingId_number: { buildingId: building.id, number: floorNumber } },
      update: { label: `Floor ${floorNumber}` },
      create: {
        communityId: community.id,
        buildingId: building.id,
        number: floorNumber,
        label: `Floor ${floorNumber}`,
      },
    });

    for (let unit = 1; unit <= 4; unit += 1) {
      const code = `A-${floorNumber}0${unit}`;
      const flat = await prisma.flat.upsert({
        where: { communityId_code: { communityId: community.id, code } },
        update: {},
        create: {
          communityId: community.id,
          floorId: floor.id,
          code,
          type: unit <= 2 ? "2BHK" : "3BHK",
          areaSqft: unit <= 2 ? 1050 : 1450,
        },
      });
      flatIds.push(flat.id);
    }
  }

  const residentFlatId = flatIds[0];
  if (residentFlatId) {
    const existingOccupant = await prisma.flatOccupant.findFirst({
      where: { flatId: residentFlatId, userId: resident.id },
    });
    if (!existingOccupant) {
      await prisma.flatOccupant.create({
        data: {
          communityId: community.id,
          flatId: residentFlatId,
          userId: resident.id,
          relation: "OWNER",
          isPrimary: true,
          movedInAt: new Date(),
        },
      });
      await prisma.flat.update({
        where: { id: residentFlatId },
        data: { status: "OCCUPIED" },
      });
    }
  }

  console.info("Seed complete.");
  console.info("--------------------------------------------------");
  console.info(`Community:         ${community.name} (${community.id})`);
  console.info(`Password for all:  ${DEV_PASSWORD}`);
  console.info(`Super Admin:       super@superlink.dev`);
  console.info(`Community Admin:   admin@greenvalley.dev   → ${admin.email}`);
  console.info(`Security Guard:    security@greenvalley.dev → ${guard.email}`);
  console.info(`Staff:             staff@greenvalley.dev   → ${staff.email}`);
  console.info(`Resident:          resident@greenvalley.dev → ${resident.email}`);
  console.info(`Structure:         ${building.name} · ${flatIds.length} flats`);
  console.info("--------------------------------------------------");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
