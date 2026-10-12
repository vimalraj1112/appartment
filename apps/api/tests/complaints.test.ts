import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();

let admin: TestActor;
let resident: TestActor;
let otherResident: TestActor;
let staff: TestActor;
let otherAdmin: TestActor;
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
  const community = await createCommunity("Complaints Community");
  const other = await createCommunity("Complaints Other");

  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });
  otherResident = await createActor({ role: "RESIDENT", communityId: community.id });
  staff = await createActor({ role: "STAFF", communityId: community.id });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });

  flatId = await makeFlat(community.id, "C-101");
  await prisma.flatOccupant.createMany({
    data: [
      { communityId: community.id, flatId, userId: resident.id, relation: "OWNER", isPrimary: true, movedInAt: new Date() },
      { communityId: community.id, flatId, userId: otherResident.id, relation: "TENANT", isPrimary: false, movedInAt: new Date() },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("complaint categories", () => {
  it("lets an admin create a category and residents read it", async () => {
    const created = await request(app)
      .post("/api/v1/complaints/categories")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ name: "Plumbing", slaHours: 24 });
    expect(created.status).toBe(200);

    const list = await request(app)
      .get("/api/v1/complaints/categories")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((c: { id: string }) => c.id === created.body.data.id)).toBe(true);
  });

  it("forbids non-admins from creating categories", async () => {
    const response = await request(app)
      .post("/api/v1/complaints/categories")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ name: "Nope" });
    expect(response.status).toBe(403);
  });
});

describe("complaints", () => {
  it("lets a resident raise a complaint for their own flat", async () => {
    const response = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ title: "Leaking tap", description: "Water is dripping.", priority: "HIGH" });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("OPEN");
    expect(response.body.data.flat.id).toBe(flatId);
  });

  it("scopes the list: resident sees own, admin sees all", async () => {
    const residentList = await request(app)
      .get("/api/v1/complaints")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(residentList.status).toBe(200);

    const adminList = await request(app)
      .get("/api/v1/complaints")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data.length).toBeGreaterThanOrEqual(residentList.body.data.length);
  });

  it("returns 404 for another community's complaint", async () => {
    const created = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ title: "Private", description: "Only for my community." });

    const response = await request(app)
      .get(`/api/v1/complaints/${created.body.data.id}`)
      .set("Authorization", `Bearer ${otherAdmin.accessToken}`);
    expect(response.status).toBe(404);
  });
});

describe("assignment and work", () => {
  let complaintId: string;

  it("lets an admin assign a complaint to staff", async () => {
    const created = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ title: "Broken lift", description: "The lift is stuck on floor 3." });
    complaintId = created.body.data.id;

    const assign = await request(app)
      .post(`/api/v1/complaints/${complaintId}/assign`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ staffUserId: staff.id });
    expect(assign.status).toBe(200);
    expect(assign.body.data.status).toBe("ASSIGNED");
    expect(assign.body.data.assignedTo.id).toBe(staff.id);
  });

  it("shows the assigned complaint to the staff member", async () => {
    const list = await request(app)
      .get("/api/v1/complaints")
      .set("Authorization", `Bearer ${staff.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((c: { id: string }) => c.id === complaintId)).toBe(true);
  });

  it("lets the assigned staff member move the status forward", async () => {
    const update = await request(app)
      .patch(`/api/v1/complaints/${complaintId}`)
      .set("Authorization", `Bearer ${staff.accessToken}`)
      .send({ status: "IN_PROGRESS" });
    expect(update.status).toBe(200);
    expect(update.body.data.status).toBe("IN_PROGRESS");
  });

  it("forbids a resident from assigning complaints", async () => {
    const response = await request(app)
      .post(`/api/v1/complaints/${complaintId}/assign`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ staffUserId: staff.id });
    expect(response.status).toBe(403);
  });

  it("hides an unassigned complaint from staff", async () => {
    const created = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ title: "Unassigned", description: "Not assigned to anyone yet." });

    const response = await request(app)
      .patch(`/api/v1/complaints/${created.body.data.id}`)
      .set("Authorization", `Bearer ${staff.accessToken}`)
      .send({ status: "RESOLVED" });
    expect(response.status).toBe(404);
  });
});

describe("comments and rating", () => {
  let complaintId: string;

  it("keeps internal comments hidden from residents", async () => {
    const created = await request(app)
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ title: "Noise", description: "Loud music late at night." });
    complaintId = created.body.data.id;

    await request(app)
      .post(`/api/v1/complaints/${complaintId}/comments`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ body: "It is very loud.", isInternal: true });

    await request(app)
      .post(`/api/v1/complaints/${complaintId}/comments`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ body: "Internal note.", isInternal: true });

    const residentView = await request(app)
      .get(`/api/v1/complaints/${complaintId}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(residentView.body.data.comments.length).toBe(1);
    expect(residentView.body.data.comments[0].isInternal).toBe(false);

    const adminView = await request(app)
      .get(`/api/v1/complaints/${complaintId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(adminView.body.data.comments.length).toBe(2);
  });

  it("lets the raiser rate a resolved complaint", async () => {
    await request(app)
      .patch(`/api/v1/complaints/${complaintId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "RESOLVED" });

    const rated = await request(app)
      .post(`/api/v1/complaints/${complaintId}/rating`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ rating: 5 });
    expect(rated.status).toBe(200);
    expect(rated.body.data.rating).toBe(5);
  });

  it("forbids a different resident from rating", async () => {
    const response = await request(app)
      .post(`/api/v1/complaints/${complaintId}/rating`)
      .set("Authorization", `Bearer ${otherResident.accessToken}`)
      .send({ rating: 1 });
    expect(response.status).toBe(403);
  });
});
