import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();

let resident: TestActor;
let communityId: string;

beforeAll(async () => {
  const community = await createCommunity("Dashboard Community");
  communityId = community.id;
  resident = await createActor({ role: "RESIDENT", communityId: community.id });

  const building = await prisma.building.create({
    data: { communityId: community.id, name: "Tower D", towerCode: "D" },
  });
  const floor = await prisma.floor.create({
    data: { communityId: community.id, buildingId: building.id, label: "1", number: 1 },
  });
  const flat = await prisma.flat.create({
    data: {
      communityId: community.id,
      floorId: floor.id,
      code: "D-101",
      type: "2BHK",
      areaSqft: 950,
      status: "OCCUPIED",
    },
  });

  await prisma.flatOccupant.create({
    data: {
      communityId: community.id,
      flatId: flat.id,
      userId: resident.id,
      relation: "OWNER",
      isPrimary: true,
      movedInAt: new Date(),
    },
  });

  await prisma.familyMember.create({
    data: { communityId: community.id, flatId: flat.id, name: "Sam Resident", relation: "Spouse" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("resident dashboard", () => {
  it("returns the resident profile, primary flat, family and stats", async () => {
    const response = await request(app)
      .get("/api/v1/dashboard")
      .set("Authorization", `Bearer ${resident.accessToken}`);

    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.user.id).toBe(resident.id);
    expect(data.community.id).toBe(communityId);
    expect(data.primaryFlat.flat.code).toBe("D-101");
    expect(data.primaryFlat.flat.floor.building.name).toBe("Tower D");
    expect(data.familyMembers).toHaveLength(1);
    expect(data.stats.flats).toBe(1);
    expect(data.stats.familyMembers).toBe(1);
    expect(typeof data.stats.unreadNotifications).toBe("number");
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/v1/dashboard");
    expect(response.status).toBe(401);
  });
});
