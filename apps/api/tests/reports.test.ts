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
let security: TestActor;
let staff: TestActor;
let otherAdmin: TestActor;
let communityId: string;

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function get(path: string, actor: TestActor) {
  return request(app).get(path).set("Authorization", `Bearer ${actor.accessToken}`);
}

async function makeFlat(code: string, status: "OCCUPIED" | "VACANT") {
  const building = await prisma.building.create({
    data: { communityId, name: `P10-${code}`, towerCode: code },
  });
  const floor = await prisma.floor.create({
    data: { communityId, buildingId: building.id, label: "1", number: 1 },
  });
  return prisma.flat.create({
    data: { communityId, floorId: floor.id, code, type: "2BHK", status },
  });
}

beforeAll(async () => {
  const community = await createCommunity("Reports Community");
  communityId = community.id;
  const other = await createCommunity("Reports Other");

  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId });
  resident = await createActor({ role: "RESIDENT", communityId });
  security = await createActor({ role: "SECURITY", communityId });
  staff = await createActor({ role: "STAFF", communityId });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });

  const occupied = await makeFlat(`10A-${RUN}`, "OCCUPIED");
  await makeFlat(`10B-${RUN}`, "VACANT");

  await prisma.flatOccupant.create({
    data: { communityId, flatId: occupied.id, userId: resident.id, relation: "OWNER", isPrimary: true, movedInAt: new Date() },
  });

  // Complaints: one open, one resolved.
  await prisma.complaint.create({
    data: {
      communityId,
      raisedById: resident.id,
      flatId: occupied.id,
      title: "Leaky tap",
      description: "Kitchen tap is leaking.",
      status: "OPEN",
      priority: "HIGH",
    },
  });
  await prisma.complaint.create({
    data: {
      communityId,
      raisedById: resident.id,
      flatId: occupied.id,
      title: "Broken lift",
      description: "Lift stuck.",
      status: "RESOLVED",
      priority: "URGENT",
      resolvedAt: new Date(),
      closedAt: new Date(),
    },
  });

  // Current-cycle bill + a successful payment.
  const bill = await prisma.maintenanceBill.create({
    data: {
      communityId,
      flatId: occupied.id,
      period: currentPeriod(),
      totalInr: 1000,
      status: "PENDING",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.payment.create({
    data: {
      communityId,
      billId: bill.id,
      amountInr: 600,
      provider: "MOCK",
      status: "SUCCESS",
      idempotencyKey: `reports-${RUN}`,
    },
  });

  // Gate activity within the default 12h handover window.
  const visitor = await prisma.visitor.create({
    data: { communityId, name: `Guest ${RUN}`, phone: "9000000000", flatId: occupied.id },
  });
  await prisma.visitorEntry.create({
    data: { communityId, visitorId: visitor.id, direction: "IN", method: "WALK_IN", guardUserId: security.id },
  });
  const delivery = await prisma.delivery.create({
    data: { communityId, flatId: occupied.id, category: "FOOD", company: "Swiggy" },
  });
  await prisma.deliveryEntry.create({
    data: { communityId, deliveryId: delivery.id, status: "DELIVERED", guardUserId: security.id },
  });
  await prisma.staffEntry.create({
    data: { communityId, staffUserId: staff.id, direction: "IN", guardUserId: security.id },
  });
  await prisma.emergencyAlert.create({
    data: { communityId, userId: resident.id, flatId: occupied.id, category: "MEDICAL", status: "RESOLVED" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("community reports & analytics", () => {
  it("returns an overview scoped to the community", async () => {
    const response = await get("/api/v1/reports/overview", admin);
    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.flats.total).toBe(2);
    expect(data.flats.occupied).toBe(1);
    expect(data.flats.occupancyRate).toBe(50);
    expect(data.billing.billedInr).toBe(1000);
    expect(data.billing.collectedInr).toBe(600);
    expect(data.billing.collectionRate).toBe(60);
    expect(data.complaints.total).toBe(2);
    expect(data.complaints.open).toBe(1);
    expect(data.complaints.resolved).toBe(1);
  });

  it("does not leak another community's data", async () => {
    const response = await get("/api/v1/reports/overview", otherAdmin);
    expect(response.status).toBe(200);
    expect(response.body.data.flats.total).toBe(0);
    expect(response.body.data.billing.billedInr).toBe(0);
  });

  it("returns a monthly collections trend", async () => {
    const response = await get("/api/v1/reports/trends?months=3", admin);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);
    const latest = response.body.data[2];
    expect(latest.period).toBe(currentPeriod());
    expect(latest.billedInr).toBe(1000);
    expect(latest.collectedInr).toBe(600);
  });

  it("returns complaint and expense breakdowns", async () => {
    const response = await get("/api/v1/reports/breakdown", admin);
    expect(response.status).toBe(200);
    const open = response.body.data.complaintsByStatus.find((row: { status: string }) => row.status === "OPEN");
    expect(open.count).toBe(1);
    expect(Array.isArray(response.body.data.complaintsByPriority)).toBe(true);
  });

  it("computes a health scorecard", async () => {
    const response = await get("/api/v1/reports/scorecard", admin);
    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.metrics).toHaveLength(5);
    expect(data.overall).toBeGreaterThanOrEqual(0);
    expect(data.overall).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "E"]).toContain(data.grade);
    expect(data.metrics.find((metric: { key: string }) => metric.key === "occupancy").score).toBe(50);
  });

  it("blocks non-admins from the reports routes", async () => {
    for (const actor of [resident, security, staff]) {
      const response = await get("/api/v1/reports/overview", actor);
      expect(response.status, `${actor.role} should be blocked`).toBe(403);
    }
  });
});

describe("guard shift handover", () => {
  it("returns a handover summary for gate operators", async () => {
    const response = await get("/api/v1/handover", security);
    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.totals.visitorEntries).toBeGreaterThanOrEqual(1);
    expect(data.totals.walkIns).toBeGreaterThanOrEqual(1);
    expect(data.totals.deliveries).toBeGreaterThanOrEqual(1);
    expect(data.totals.deliveryEvents).toBeGreaterThanOrEqual(1);
    expect(data.totals.staffEntries).toBeGreaterThanOrEqual(1);
    expect(data.totals.emergencyAlerts).toBeGreaterThanOrEqual(1);
    expect(data.visitorEntries.length).toBeGreaterThanOrEqual(1);
  });

  it("lets the community admin read it too", async () => {
    const response = await get("/api/v1/handover", admin);
    expect(response.status).toBe(200);
  });

  it("rejects an invalid window", async () => {
    const response = await get("/api/v1/handover?from=2026-01-02T00:00:00Z&to=2026-01-01T00:00:00Z", admin);
    expect(response.status).toBe(400);
  });

  it("blocks residents and staff", async () => {
    for (const actor of [resident, staff]) {
      const response = await get("/api/v1/handover", actor);
      expect(response.status, `${actor.role} should be blocked`).toBe(403);
    }
  });
});
