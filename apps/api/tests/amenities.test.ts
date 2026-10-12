import request from "supertest";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();

const RUN = randomUUID().slice(0, 8);

let admin: TestActor;
let resident: TestActor;
let resident2: TestActor;
let security: TestActor;
let otherAdmin: TestActor;

async function makeFlat(communityId: string, code: string) {
  const building = await prisma.building.create({
    data: { communityId, name: `P7-${code}`, towerCode: code },
  });
  const floor = await prisma.floor.create({
    data: { communityId, buildingId: building.id, label: "1", number: 1 },
  });
  const flat = await prisma.flat.create({
    data: { communityId, floorId: floor.id, code, type: "2BHK", status: "OCCUPIED" },
  });
  return flat.id;
}

beforeAll(async () => {
  const community = await createCommunity("Amenities Community");
  const other = await createCommunity("Amenity Other");

  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });
  resident2 = await createActor({ role: "RESIDENT", communityId: community.id });
  security = await createActor({ role: "SECURITY", communityId: community.id });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });

  const flat1 = await makeFlat(community.id, `P7-101-${RUN}`);
  const flat2 = await makeFlat(community.id, `B-102-${RUN}`);
  await prisma.flatOccupant.createMany({
    data: [
      { communityId: community.id, flatId: flat1, userId: resident.id, relation: "OWNER", isPrimary: true, movedInAt: new Date() },
      { communityId: community.id, flatId: flat2, userId: resident2.id, relation: "OWNER", isPrimary: true, movedInAt: new Date() },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const DATE = "2026-05-20";
const SLOT_START = "2026-05-20T09:00:00.000Z";

describe("amenities", () => {
  let amenityId: string;

  it("lets an admin configure an amenity", async () => {
    const response = await request(app)
      .post("/api/v1/amenities")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        name: `Clubhouse ${RUN}`,
        slotMinutes: 60,
        capacity: 1,
        openTime: "06:00",
        closeTime: "22:00",
        feeInr: 0,
      });
    expect(response.status).toBe(200);
    expect(response.body.data.capacity).toBe(1);
    amenityId = response.body.data.id;
  });

  it("blocks residents from configuring amenities", async () => {
    const response = await request(app)
      .post("/api/v1/amenities")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ name: "Nope" });
    expect(response.status).toBe(403);
  });

  it("blocks security from viewing amenities", async () => {
    const response = await request(app)
      .get("/api/v1/amenities")
      .set("Authorization", `Bearer ${security.accessToken}`);
    expect(response.status).toBe(403);
  });

  it("returns availability with open slots", async () => {
    const response = await request(app)
      .get(`/api/v1/amenities/${amenityId}/availability?date=${DATE}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.slots.length).toBeGreaterThan(0);
    expect(response.body.data.slots[0].available).toBe(1);
  });

  it("books a slot for the resident's flat", async () => {
    const response = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ amenityId, date: DATE, slotStart: SLOT_START });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("BOOKED");
    expect(response.body.data.flat.code).toBeTruthy();
  });

  it("waitlists a second flat when the slot is full, then auto-promotes on cancel", async () => {
    const waitlisted = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${resident2.accessToken}`)
      .send({ amenityId, date: DATE, slotStart: SLOT_START });
    expect(waitlisted.status).toBe(200);
    expect(waitlisted.body.data.status).toBe("WAITLISTED");
    expect(waitlisted.body.data.waitlistPosition).toBe(1);

    const list = await request(app)
      .get("/api/v1/bookings?mine=true")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    const bookingId = list.body.data[0].id;

    const cancelled = await request(app)
      .delete(`/api/v1/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.promoted).toBeTruthy();

    const promoted = await request(app)
      .get("/api/v1/bookings?mine=true")
      .set("Authorization", `Bearer ${resident2.accessToken}`);
    expect(promoted.body.data[0].status).toBe("BOOKED");
  });

  it("scopes bookings so a resident cannot cancel another resident's booking", async () => {
    const book = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ amenityId, date: "2026-05-21", slotStart: "2026-05-21T09:00:00.000Z" });
    expect(book.status).toBe(200);

    const response = await request(app)
      .delete(`/api/v1/bookings/${book.body.data.id}`)
      .set("Authorization", `Bearer ${resident2.accessToken}`);
    expect(response.status).toBe(404);
  });
});

describe("vehicles", () => {
  let vehicleId: string;

  it("registers a vehicle for the resident", async () => {
    const response = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ regNumber: `KA01AB${RUN.slice(0, 4)}`, type: "CAR", brand: "Honda" });
    expect(response.status).toBe(200);
    expect(response.body.data.regNumber).toBe(`KA01AB${RUN.slice(0, 4)}`.toUpperCase());
    vehicleId = response.body.data.id;
  });

  it("rejects duplicate registration numbers", async () => {
    const response = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${resident2.accessToken}`)
      .send({ regNumber: `KA01AB${RUN.slice(0, 4)}` });
    expect(response.status).toBe(409);
  });

  it("hides other residents' vehicles from a resident", async () => {
    const response = await request(app)
      .get("/api/v1/vehicles")
      .set("Authorization", `Bearer ${resident2.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.some((v: { id: string }) => v.id === vehicleId)).toBe(false);
  });

  it("lets security search all vehicles", async () => {
    const response = await request(app)
      .get(`/api/v1/vehicles?q=KA01AB${RUN.slice(0, 4)}`)
      .set("Authorization", `Bearer ${security.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("lets the owner delete the vehicle", async () => {
    const response = await request(app)
      .delete(`/api/v1/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(response.status).toBe(200);
  });
});

describe("parking", () => {
  let slotId: string;

  it("lets an admin create a slot and blocks residents", async () => {
    const blocked = await request(app)
      .post("/api/v1/parking/slots")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ code: `Z-${RUN}` });
    expect(blocked.status).toBe(403);

    const response = await request(app)
      .post("/api/v1/parking/slots")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ code: `Z-${RUN}`, zone: "Basement" });
    expect(response.status).toBe(200);
    slotId = response.body.data.id;
  });

  it("lets residents view slots", async () => {
    const response = await request(app)
      .get("/api/v1/parking/slots")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(response.status).toBe(200);
  });

  it("assigns a slot, blocks double assignment, then releases it", async () => {
    const assign = await request(app)
      .post("/api/v1/parking/assignments")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ slotId });
    expect(assign.status).toBe(200);
    const assignmentId = assign.body.data.id;

    const again = await request(app)
      .post("/api/v1/parking/assignments")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ slotId });
    expect(again.status).toBe(409);

    const end = await request(app)
      .post(`/api/v1/parking/assignments/${assignmentId}/end`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({});
    expect(end.status).toBe(200);

    const slots = await request(app)
      .get(`/api/v1/parking/slots?q=Z-${RUN}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(slots.body.data[0].status).toBe("AVAILABLE");
  });

  it("lets security register visitor parking but not manage slots", async () => {
    const visitor = await request(app)
      .post("/api/v1/parking/visitors")
      .set("Authorization", `Bearer ${security.accessToken}`)
      .send({ regNumber: `DL09XY${RUN.slice(0, 4)}`, name: "Guest" });
    expect(visitor.status).toBe(200);

    const list = await request(app)
      .get(`/api/v1/parking/visitors?active=true`)
      .set("Authorization", `Bearer ${security.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(1);

    const forbidden = await request(app)
      .post("/api/v1/parking/slots")
      .set("Authorization", `Bearer ${security.accessToken}`)
      .send({ code: `X-${RUN}` });
    expect(forbidden.status).toBe(403);
  });

  it("returns 404 for another community's slot", async () => {
    const response = await request(app)
      .patch(`/api/v1/parking/slots/${slotId}`)
      .set("Authorization", `Bearer ${otherAdmin.accessToken}`)
      .send({ status: "MAINTENANCE" });
    expect(response.status).toBe(404);
  });
});
