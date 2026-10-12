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
let staff: TestActor;
let otherAdmin: TestActor;
let residentFlatId: string;

async function makeFlat(communityId: string, code: string) {
  const building = await prisma.building.create({ data: { communityId, name: `P9-${code}`, towerCode: code } });
  const floor = await prisma.floor.create({ data: { communityId, buildingId: building.id, label: "1", number: 1 } });
  const flat = await prisma.flat.create({
    data: { communityId, floorId: floor.id, code, type: "2BHK", status: "OCCUPIED" },
  });
  return flat.id;
}

beforeAll(async () => {
  const community = await createCommunity("Emergency Community");
  const other = await createCommunity("Emergency Other");

  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });
  resident2 = await createActor({ role: "RESIDENT", communityId: community.id });
  security = await createActor({ role: "SECURITY", communityId: community.id });
  staff = await createActor({ role: "STAFF", communityId: community.id });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });

  residentFlatId = await makeFlat(community.id, `9A-101-${RUN}`);
  const flat2 = await makeFlat(community.id, `9B-102-${RUN}`);
  await prisma.flatOccupant.createMany({
    data: [
      { communityId: community.id, flatId: residentFlatId, userId: resident.id, relation: "OWNER", isPrimary: true, movedInAt: new Date() },
      { communityId: community.id, flatId: flat2, userId: resident2.id, relation: "OWNER", isPrimary: true, movedInAt: new Date() },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function trigger(actor: TestActor, body: Record<string, unknown>) {
  return request(app).post("/api/v1/emergency").set("Authorization", `Bearer ${actor.accessToken}`).send(body);
}

describe("emergency alerts", () => {
  let alertId: string;

  it("lets a resident trigger an alert tied to their flat", async () => {
    const response = await trigger(resident, { category: "MEDICAL", note: "Chest pain" });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("TRIGGERED");
    expect(response.body.data.flat.id).toBe(residentFlatId);
    expect(response.body.data.user.id).toBe(resident.id);
    alertId = response.body.data.id;
  });

  it("notifies responders in the community", async () => {
    const notifications = await prisma.notification.findMany({
      where: { userId: { in: [admin.id, security.id] }, type: "EMERGENCY" },
    });
    expect(notifications.length).toBeGreaterThanOrEqual(2);
  });

  it("blocks a second active alert from the same resident", async () => {
    const response = await trigger(resident, { category: "FIRE" });
    expect(response.status).toBe(409);
  });

  it("lets security see and acknowledge the active alert", async () => {
    const list = await request(app)
      .get("/api/v1/emergency?status=TRIGGERED")
      .set("Authorization", `Bearer ${security.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((a: { id: string }) => a.id === alertId)).toBe(true);

    const ack = await request(app)
      .post(`/api/v1/emergency/${alertId}/acknowledge`)
      .set("Authorization", `Bearer ${security.accessToken}`)
      .send({ note: "On my way" });
    expect(ack.status).toBe(200);
    expect(ack.body.data.status).toBe("ACKNOWLEDGED");
    expect(ack.body.data.acknowledgedBy.id).toBe(security.id);
  });

  it("blocks residents from acknowledging", async () => {
    const response = await request(app)
      .post(`/api/v1/emergency/${alertId}/acknowledge`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({});
    expect(response.status).toBe(403);
  });

  it("keeps an alert visible to its flat but hidden from other residents", async () => {
    const mine = await request(app)
      .get("/api/v1/emergency")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(mine.body.data.some((a: { id: string }) => a.id === alertId)).toBe(true);

    const other = await request(app)
      .get("/api/v1/emergency")
      .set("Authorization", `Bearer ${resident2.accessToken}`);
    expect(other.body.data.some((a: { id: string }) => a.id === alertId)).toBe(false);

    const hidden = await request(app)
      .get(`/api/v1/emergency/${alertId}`)
      .set("Authorization", `Bearer ${resident2.accessToken}`);
    expect(hidden.status).toBe(404);
  });

  it("does not reveal another community's alert", async () => {
    const response = await request(app)
      .get(`/api/v1/emergency/${alertId}`)
      .set("Authorization", `Bearer ${otherAdmin.accessToken}`);
    expect(response.status).toBe(404);
  });

  it("lets an admin resolve the alert", async () => {
    const response = await request(app)
      .post(`/api/v1/emergency/${alertId}/resolve`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ note: "Handled" });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("RESOLVED");
    expect(response.body.data.resolvedBy.id).toBe(admin.id);
  });

  it("rejects re-acknowledging or re-resolving a resolved alert", async () => {
    const ack = await request(app)
      .post(`/api/v1/emergency/${alertId}/acknowledge`)
      .set("Authorization", `Bearer ${security.accessToken}`)
      .send({});
    expect(ack.status).toBe(409);

    const resolve = await request(app)
      .post(`/api/v1/emergency/${alertId}/resolve`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({});
    expect(resolve.status).toBe(409);
  });

  it("blocks staff entirely", async () => {
    const list = await request(app)
      .get("/api/v1/emergency")
      .set("Authorization", `Bearer ${staff.accessToken}`);
    expect(list.status).toBe(403);

    const triggerResponse = await trigger(staff, { category: "OTHER" });
    expect(triggerResponse.status).toBe(403);
  });

  it("prevents a resident from targeting another flat", async () => {
    const response = await trigger(resident, { category: "SECURITY", flatId: randomUUID() });
    expect(response.status).toBe(403);
  });

  it("rate-limits a resident after several alerts", async () => {
    for (let i = 0; i < 5; i += 1) {
      const created = await trigger(resident2, { category: "OTHER" });
      expect(created.status).toBe(200);
      const resolved = await request(app)
        .post(`/api/v1/emergency/${created.body.data.id}/resolve`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({});
      expect(resolved.status).toBe(200);
    }
    const limited = await trigger(resident2, { category: "OTHER" });
    expect(limited.status).toBe(429);
  });
});
