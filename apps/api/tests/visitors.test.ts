import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();

let admin: TestActor;
let resident: TestActor;
let otherResident: TestActor;
let guard: TestActor;
let otherAdmin: TestActor;
let flatId: string;
let otherFlatId: string;

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

async function occupy(communityId: string, flatId: string, userId: string) {
  await prisma.flatOccupant.create({
    data: { communityId, flatId, userId, relation: "OWNER", isPrimary: true, movedInAt: new Date() },
  });
}

beforeAll(async () => {
  const community = await createCommunity("Visitors Community");
  const other = await createCommunity("Visitors Other");

  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  guard = await createActor({ role: "SECURITY", communityId: community.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });
  otherResident = await createActor({ role: "RESIDENT", communityId: community.id });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });

  flatId = await makeFlat(community.id, "V-101");
  otherFlatId = await makeFlat(community.id, "V-102");
  await occupy(community.id, flatId, resident.id);
  await occupy(community.id, otherFlatId, otherResident.id);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createPassFor(actor: TestActor, name = "Guest Visitor") {
  const response = await request(app)
    .post("/api/v1/visitors/passes")
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({ visitorName: name, visitorPhone: "9876543210", type: "SINGLE_USE" });
  return response;
}

describe("visitor passes", () => {
  it("lets a resident create a pass for their own flat", async () => {
    const response = await createPassFor(resident);
    expect(response.status).toBe(200);
    expect(response.body.data.pass.status).toBe("ACTIVE");
    expect(response.body.data.pass.flat.id).toBe(flatId);
    expect(response.body.data.qrToken).toBeTruthy();
    expect(response.body.data.shareUrl).toContain("/pass/");
  });

  it("scopes a resident's pass list to their own flat", async () => {
    await createPassFor(otherResident, "Other Guest");

    const list = await request(app)
      .get("/api/v1/visitors/passes")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.every((p: { flat: { id: string } }) => p.flat.id === flatId)).toBe(true);

    const otherList = await request(app)
      .get("/api/v1/visitors/passes")
      .set("Authorization", `Bearer ${otherResident.accessToken}`);
    expect(otherList.body.data.every((p: { flat: { id: string } }) => p.flat.id === otherFlatId)).toBe(true);
  });

  it("lets an admin create a pass for any flat and see all passes", async () => {
    const created = await request(app)
      .post("/api/v1/visitors/passes")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ visitorName: "Admin Guest", flatId });
    expect(created.status).toBe(200);
    expect(created.body.data.pass.flat.id).toBe(flatId);

    const list = await request(app)
      .get("/api/v1/visitors/passes")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    const flats = new Set(list.body.data.map((p: { flat: { id: string } }) => p.flat.id));
    expect(flats.size).toBeGreaterThan(1);
  });

  it("returns 404 for another community's pass", async () => {    const created = await createPassFor(resident, "Hidden Guest");
    const id = created.body.data.pass.id;

    const response = await request(app)
      .get(`/api/v1/visitors/passes/${id}`)
      .set("Authorization", `Bearer ${otherAdmin.accessToken}`);
    expect(response.status).toBe(404);
  });
});

describe("gate operations", () => {
  it("forbids a resident from scanning/verifying", async () => {
    const created = await createPassFor(resident, "Scan Denied");
    const response = await request(app)
      .post("/api/v1/visitors/verify")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ code: created.body.data.pass.code });
    expect(response.status).toBe(403);
  });

  it("forbids a guard from creating a pass", async () => {
    const response = await request(app)
      .post("/api/v1/visitors/passes")
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ visitorName: "Nope" });
    expect(response.status).toBe(403);
  });

  it("verifies a pass by code and registers entry marking it used", async () => {
    const created = await createPassFor(resident, "Scanned Guest");
    const pass = created.body.data.pass;

    const verified = await request(app)
      .post("/api/v1/visitors/verify")
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ code: pass.code });
    expect(verified.status).toBe(200);
    expect(verified.body.data.pass.id).toBe(pass.id);

    const entry = await request(app)
      .post("/api/v1/visitors/entries")
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ passId: pass.id, visitorId: pass.visitor.id, direction: "IN", method: "QR" });
    expect(entry.status).toBe(200);

    const after = await request(app)
      .get(`/api/v1/visitors/passes/${pass.id}`)
      .set("Authorization", `Bearer ${guard.accessToken}`);
    expect(after.body.data.status).toBe("USED");
  });

  it("returns 404 verifying an unknown code", async () => {
    const response = await request(app)
      .post("/api/v1/visitors/verify")
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ code: "ZZZZZZZZZZ" });
    expect(response.status).toBe(404);
  });
});

describe("walk-in approvals", () => {
  it("creates a pending pass, notifies the resident, then approves", async () => {
    const walkIn = await request(app)
      .post("/api/v1/visitors/walk-in")
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ name: "Walk In Guest", phone: "9000000001", flatId });
    expect(walkIn.status).toBe(200);
    expect(walkIn.body.data.pass.status).toBe("PENDING");

    const count = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(count.body.data.count).toBeGreaterThan(0);

    const decision = await request(app)
      .post(`/api/v1/visitors/passes/${walkIn.body.data.pass.id}/decision`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ decision: "APPROVE" });
    expect(decision.status).toBe(200);
    expect(decision.body.data.status).toBe("ACTIVE");
  });

  it("lets the other resident not decide on a pass for a flat that is not theirs", async () => {
    const walkIn = await request(app)
      .post("/api/v1/visitors/walk-in")
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ name: "Foreign Decision", phone: "9000000002", flatId });

    const decision = await request(app)
      .post(`/api/v1/visitors/passes/${walkIn.body.data.pass.id}/decision`)
      .set("Authorization", `Bearer ${otherResident.accessToken}`)
      .send({ decision: "REJECT" });
    expect(decision.status).toBe(404);
  });
});

describe("deliveries", () => {
  it("logs a delivery, updates status and notifies the resident", async () => {
    const created = await request(app)
      .post("/api/v1/visitors/deliveries")
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ flatId, category: "FOOD", company: "Swiggy" });
    expect(created.status).toBe(200);

    const updated = await request(app)
      .patch(`/api/v1/visitors/deliveries/${created.body.data.id}/status`)
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ status: "ARRIVED" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe("ARRIVED");

    const residentList = await request(app)
      .get("/api/v1/visitors/deliveries")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(residentList.body.data.some((d: { id: string }) => d.id === created.body.data.id)).toBe(true);
  });

  it("forbids a resident from creating deliveries", async () => {
    const response = await request(app)
      .post("/api/v1/visitors/deliveries")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ flatId, category: "FOOD" });
    expect(response.status).toBe(403);
  });
});

describe("watchlist", () => {
  it("flags a matching visitor on verify", async () => {
    await request(app)
      .post("/api/v1/visitors/watchlist")
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ type: "PERSON", name: "Flagged Person", reason: "Unpaid dues" });

    const created = await createPassFor(resident, "Flagged Person");
    const verified = await request(app)
      .post("/api/v1/visitors/verify")
      .set("Authorization", `Bearer ${guard.accessToken}`)
      .send({ code: created.body.data.pass.code });
    expect(verified.body.data.watchlisted).toBe(true);
  });
});

describe("public shareable pass", () => {
  it("returns a limited pass summary without auth", async () => {
    const created = await createPassFor(resident, "Public Guest");
    const token = created.body.data.qrToken as string;

    const response = await request(app).get(`/api/v1/visitors/public/passes/${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.visitorName).toBe("Public Guest");
    expect(response.body.data.code).toBe(created.body.data.pass.code);
  });
});
