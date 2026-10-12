import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();

let admin: TestActor;
let resident: TestActor;
let staff: TestActor;
let flatId: string;

async function makeFlat(communityId: string, code: string) {
  const building = await prisma.building.create({
    data: { communityId, name: `B-${code}`, towerCode: code },
  });
  const floor = await prisma.floor.create({
    data: { communityId, buildingId: building.id, label: "1", number: 1 },
  });
  const flat = await prisma.flat.create({
    data: { communityId, floorId: floor.id, code, status: "OCCUPIED" },
  });
  return flat.id;
}

beforeAll(async () => {
  const community = await createCommunity("Staff Community");

  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  staff = await createActor({ role: "STAFF", communityId: community.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });

  flatId = await makeFlat(community.id, "S-101");
  await prisma.flatOccupant.create({
    data: { communityId: community.id, flatId, userId: resident.id, relation: "OWNER", isPrimary: true, movedInAt: new Date() },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("staff profiles", () => {
  it("lets an admin register a staff profile", async () => {
    const created = await request(app)
      .post("/api/v1/staff/profiles")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ userId: staff.id, trade: "ELECTRICIAN", availability: "AVAILABLE" });
    expect(created.status).toBe(200);
    expect(created.body.data.user.id).toBe(staff.id);
    expect(created.body.data.trade).toBe("ELECTRICIAN");

    const clash = await request(app)
      .post("/api/v1/staff/profiles")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ userId: staff.id, trade: "PLUMBER" });
    expect(clash.status).toBe(409);
  });

  it("lists staff profiles for the admin", async () => {
    const list = await request(app)
      .get("/api/v1/staff/profiles")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
  });

  it("lists staff users for the admin only", async () => {
    const list = await request(app)
      .get("/api/v1/staff/users")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((user: { id: string }) => user.id === staff.id)).toBe(true);

    const forbidden = await request(app)
      .get("/api/v1/staff/users")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(forbidden.status).toBe(403);
  });

  it("forbids non-admins from managing staff profiles", async () => {
    const response = await request(app)
      .get("/api/v1/staff/profiles")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(response.status).toBe(403);
  });
});

describe("staff gate entries", () => {
  it("lets a guard log staff entry and read entries", async () => {
    const guardActor = await createActor({ role: "SECURITY", communityId: admin.communityId as string });
    const created = await request(app)
      .post("/api/v1/staff/entries")
      .set("Authorization", `Bearer ${guardActor.accessToken}`)
      .send({ staffUserId: staff.id, direction: "IN" });
    expect(created.status).toBe(200);
    expect(created.body.data.direction).toBe("IN");

    const list = await request(app)
      .get("/api/v1/staff/entries")
      .set("Authorization", `Bearer ${guardActor.accessToken}`);
    expect(list.body.data.length).toBeGreaterThan(0);
  });

  it("forbids residents from logging staff entries", async () => {
    const response = await request(app)
      .post("/api/v1/staff/entries")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ staffUserId: staff.id, direction: "IN" });
    expect(response.status).toBe(403);
  });
});

describe("domestic staff", () => {
  it("lets a resident register domestic staff for their own flat", async () => {
    const created = await request(app)
      .post("/api/v1/staff/domestic")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ name: "Kamla Bai", phone: "9111111111", workType: "MAID" });
    expect(created.status).toBe(200);
    expect(created.body.data.flatId).toBe(flatId);
  });

  it("scopes domestic staff lists to the resident's flat", async () => {
    const other = await createActor({ role: "RESIDENT", communityId: admin.communityId as string });
    const list = await request(app)
      .get("/api/v1/staff/domestic")
      .set("Authorization", `Bearer ${other.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(0);
  });

  it("lets the resident update their domestic staff", async () => {
    const created = await request(app)
      .post("/api/v1/staff/domestic")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ name: "Cook", workType: "COOK" });
    const updated = await request(app)
      .patch(`/api/v1/staff/domestic/${created.body.data.id}`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ status: "INACTIVE" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe("INACTIVE");
  });
});
