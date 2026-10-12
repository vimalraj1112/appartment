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
let flat1: string;
let communityId: string;

const PERIOD = "2026-05";

async function makeFlat(communityId: string, code: string) {
  const building = await prisma.building.create({
    data: { communityId, name: `B-${code}`, towerCode: code },
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
  const community = await createCommunity("Billing Community");
  const other = await createCommunity("Billing Other");
  communityId = community.id;

  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });
  resident2 = await createActor({ role: "RESIDENT", communityId: community.id });
  security = await createActor({ role: "SECURITY", communityId: community.id });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });

  flat1 = await makeFlat(community.id, "B-101");
  const flat2 = await makeFlat(community.id, "B-102");
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

async function generateBills(period = PERIOD, dueDate?: string) {
  return request(app)
    .post("/api/v1/billing/bills/generate")
    .set("Authorization", `Bearer ${admin.accessToken}`)
    .send({ period, ...(dueDate ? { dueDate } : {}) });
}

describe("maintenance config", () => {
  it("lets an admin configure pricing per flat type", async () => {
    const response = await request(app)
      .put("/api/v1/billing/config")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ flatType: "2BHK", baseInr: 2000, waterInr: 200, parkingInr: 300, lateFeeInr: 100, graceDays: 5 });
    expect(response.status).toBe(200);
    expect(response.body.data.baseInr).toBe(2000);
  });

  it("forbids residents from configuring pricing", async () => {
    const response = await request(app)
      .put("/api/v1/billing/config")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ flatType: "2BHK", baseInr: 1 });
    expect(response.status).toBe(403);
  });
});

describe("bill generation", () => {
  it("generates one bill per flat and is idempotent per period", async () => {
    const first = await generateBills();
    expect(first.status).toBe(200);
    expect(first.body.data.created).toBe(2);

    const second = await generateBills();
    expect(second.body.data.created).toBe(0);
    expect(second.body.data.skipped).toBe(2);
  });

  it("scopes lists so a resident only sees their own bill", async () => {
    const list = await request(app)
      .get(`/api/v1/billing/bills?period=${PERIOD}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].flat.id).toBe(flat1);

    const adminList = await request(app)
      .get(`/api/v1/billing/bills?period=${PERIOD}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(adminList.body.data).toHaveLength(2);
  });

  it("returns 404 for another community's bill", async () => {
    const list = await request(app)
      .get(`/api/v1/billing/bills?period=${PERIOD}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    const response = await request(app)
      .get(`/api/v1/billing/bills/${list.body.data[0].id}`)
      .set("Authorization", `Bearer ${otherAdmin.accessToken}`);
    expect(response.status).toBe(404);
  });

  it("blocks security operators from finance routes", async () => {
    const response = await request(app)
      .get("/api/v1/billing/summary")
      .set("Authorization", `Bearer ${security.accessToken}`);
    expect(response.status).toBe(403);
  });
});

describe("payments", () => {
  let billId: string;
  let totalInr: number;

  it("pays a bill in full and issues a receipt", async () => {
    const list = await request(app)
      .get(`/api/v1/billing/bills?period=${PERIOD}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    const bill = list.body.data[0];
    billId = bill.id;

    const detail = await request(app)
      .get(`/api/v1/billing/bills/${billId}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    totalInr = detail.body.data.bill.totalInr;
    expect(totalInr).toBe(2500);

    const pay = await request(app)
      .post(`/api/v1/billing/bills/${billId}/pay`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ idempotencyKey: `idem-full-${RUN}` });
    expect(pay.status).toBe(200);
    expect(pay.body.data.payment.status).toBe("SUCCESS");
    expect(pay.body.data.payment.receipt.receiptNo).toMatch(/^RCPT-/);

    const after = await request(app)
      .get(`/api/v1/billing/bills/${billId}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(after.body.data.bill.status).toBe("PAID");
    expect(after.body.data.dueInr).toBe(0);
  });

  it("is idempotent for a repeated idempotency key", async () => {
    const first = await request(app)
      .post(`/api/v1/billing/bills/${billId}/pay`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ idempotencyKey: `idem-full-${RUN}` });
    expect(first.body.data.idempotent).toBe(true);
    expect(first.body.data.payment.amountInr).toBe(totalInr);
  });

  it("rejects paying another resident's bill", async () => {
    const list = await request(app)
      .get(`/api/v1/billing/bills?period=${PERIOD}`)
      .set("Authorization", `Bearer ${resident2.accessToken}`);
    const otherBill = list.body.data[0];

    const response = await request(app)
      .post(`/api/v1/billing/bills/${otherBill.id}/pay`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ idempotencyKey: `idem-cross-${RUN}` });
    expect(response.status).toBe(404);
  });

  it("supports partial payments and rejects overpayment", async () => {
    await prisma.maintenanceBill.create({
      data: {
        communityId,
        flatId: flat1,
        period: "2026-06",
        totalInr: 2500,
        dueDate: new Date("2026-07-10"),
        items: { create: { communityId, label: "Maintenance", amountInr: 2500 } },
      },
    });
    const list = await request(app)
      .get("/api/v1/billing/bills?period=2026-06")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    const billId2 = list.body.data[0].id;

    const overpay = await request(app)
      .post(`/api/v1/billing/bills/${billId2}/pay`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ amountInr: 999999, idempotencyKey: `idem-overpay-${RUN}` });
    expect(overpay.status).toBe(400);

    const partial = await request(app)
      .post(`/api/v1/billing/bills/${billId2}/pay`)
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ amountInr: 1000, idempotencyKey: `idem-partial-${RUN}` });
    expect(partial.body.data.payment.status).toBe("SUCCESS");

    const after = await request(app)
      .get(`/api/v1/billing/bills/${billId2}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(after.body.data.bill.status).toBe("PARTIAL");
    expect(after.body.data.dueInr).toBe(1500);

    const manual = await request(app)
      .post("/api/v1/payments/manual")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ billId: billId2, amountInr: 1500, provider: "CASH" });
    expect(manual.status).toBe(200);

    const settled = await request(app)
      .get(`/api/v1/billing/bills/${billId2}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(settled.body.data.bill.status).toBe("PAID");
  });
});

describe("overdue sweep", () => {
  it("adds a late fee and marks past-due bills overdue", async () => {
    await generateBills("2026-04", "2026-04-05");
    const sweep = await request(app)
      .post("/api/v1/billing/bills/overdue")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(sweep.status).toBe(200);

    const list = await request(app)
      .get("/api/v1/billing/bills?period=2026-04")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    const bill = list.body.data[0];

    const detail = await request(app)
      .get(`/api/v1/billing/bills/${bill.id}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(detail.body.data.bill.status).toBe("OVERDUE");
    expect(detail.body.data.bill.items.some((i: { label: string }) => i.label === "Late fee")).toBe(true);
    expect(detail.body.data.bill.totalInr).toBe(2600);
  });
});

describe("expenses", () => {
  it("lets admins record expenses and blocks residents", async () => {
    const category = await request(app)
      .post("/api/v1/expenses/categories")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ name: "Repairs" });
    expect(category.status).toBe(200);

    const expense = await request(app)
      .post("/api/v1/expenses")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ title: "Lift servicing", amountInr: 4500, categoryId: category.body.data.id });
    expect(expense.status).toBe(200);

    const list = await request(app)
      .get("/api/v1/expenses")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(list.body.data.some((e: { id: string }) => e.id === expense.body.data.id)).toBe(true);

    const blocked = await request(app)
      .get("/api/v1/expenses")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(blocked.status).toBe(403);
  });

  it("summarises finance totals", async () => {
    const summary = await request(app)
      .get(`/api/v1/billing/summary?period=${PERIOD}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(summary.status).toBe(200);
    expect(summary.body.data.collectedInr).toBe(2500);
    expect(summary.body.data.totalExpensesInr).toBeGreaterThanOrEqual(4500);
  });
});
