import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();
const RUN = randomUUID().slice(0, 8);

let superAdmin: TestActor;
let admin: TestActor;

beforeAll(async () => {
  const community = await createCommunity("Platform Access Community");
  superAdmin = await createActor({ role: "SUPER_ADMIN", communityId: null });
  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });

  await prisma.subscriptionPlan.create({
    data: { code: `plan-${RUN}`, name: `Plan ${RUN}`, priceMonthlyInr: 1500, flatLimit: 100 },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("platform access control", () => {
  it("requires authentication", async () => {
    const response = await request(app).get("/api/v1/platform/overview");
    expect(response.status).toBe(401);
  });

  it("blocks community admins", async () => {
    const response = await request(app)
      .get("/api/v1/platform/overview")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(response.status).toBe(403);
  });
});

describe("platform overview", () => {
  it("summarises the whole platform for super admins", async () => {
    const response = await request(app)
      .get("/api/v1/platform/overview")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.communities.total).toBeGreaterThan(0);
    expect(response.body.data.users.total).toBeGreaterThan(0);
    expect(Array.isArray(response.body.data.growth)).toBe(true);
    expect(response.body.data.revenue).toHaveProperty("mrrInr");
  });
});

describe("platform communities", () => {
  it("creates a community with a trial subscription and settings", async () => {
    const response = await request(app)
      .post("/api/v1/platform/communities")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ name: `Green Meadow ${RUN}`, city: "Pune", planCode: `plan-${RUN}` });
    expect(response.status).toBe(200);
    expect(response.body.data.slug).toContain("green-meadow");
    expect(response.body.data.subscription.status).toBe("TRIAL");
    expect(response.body.data.subscription.plan.code).toBe(`plan-${RUN}`);

    const setting = await prisma.communitySetting.findUnique({
      where: { communityId: response.body.data.id },
    });
    expect(setting?.currency).toBe("INR");
  });

  it("lists communities with pagination meta", async () => {
    const response = await request(app)
      .get("/api/v1/platform/communities?q=Green%20Meadow")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.meta).toHaveProperty("total");
  });

  it("suspends and reactivates a community", async () => {
    const created = await request(app)
      .post("/api/v1/platform/communities")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ name: `Suspension Test ${RUN}` });
    const id = created.body.data.id as string;

    const suspended = await request(app)
      .patch(`/api/v1/platform/communities/${id}/status`)
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ status: "SUSPENDED" });
    expect(suspended.status).toBe(200);
    expect(suspended.body.data.status).toBe("SUSPENDED");

    const reactivated = await request(app)
      .patch(`/api/v1/platform/communities/${id}/status`)
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ status: "ACTIVE" });
    expect(reactivated.body.data.status).toBe("ACTIVE");
  });
});

describe("platform plans and subscriptions", () => {
  it("rejects a duplicate plan code", async () => {
    const response = await request(app)
      .post("/api/v1/platform/plans")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ code: `plan-${RUN}`, name: "Dup", priceMonthlyInr: 1, flatLimit: 1 });
    expect(response.status).toBe(409);
  });

  it("creates and updates a plan", async () => {
    const created = await request(app)
      .post("/api/v1/platform/plans")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ code: `growth-${RUN}`, name: "Growth", priceMonthlyInr: 2999, flatLimit: 250 });
    expect(created.status).toBe(200);
    const id = created.body.data.id as string;

    const updated = await request(app)
      .patch(`/api/v1/platform/plans/${id}`)
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ priceMonthlyInr: 3499, isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.priceMonthlyInr).toBe(3499);
    expect(updated.body.data.isActive).toBe(false);
  });

  it("assigns and changes a subscription", async () => {
    const created = await request(app)
      .post("/api/v1/platform/communities")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ name: `Subscription Test ${RUN}` });
    const id = created.body.data.id as string;

    const assigned = await request(app)
      .put(`/api/v1/platform/communities/${id}/subscription`)
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ planCode: `plan-${RUN}`, status: "ACTIVE" });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.status).toBe("ACTIVE");
    expect(assigned.body.data.plan.code).toBe(`plan-${RUN}`);
  });

  it("lists subscriptions with pagination meta", async () => {
    const response = await request(app)
      .get("/api/v1/platform/subscriptions")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.meta).toHaveProperty("total");
  });
});

describe("platform audit log", () => {
  it("records platform actions for super admins", async () => {
    const response = await request(app)
      .get("/api/v1/platform/audit?q=PLATFORM")
      .set("Authorization", `Bearer ${superAdmin.accessToken}`);
    expect(response.status).toBe(200);
    const actions = response.body.data.map((row: { action: string }) => row.action);
    expect(actions).toContain("PLATFORM.COMMUNITY.CREATE");
  });

  it("blocks non-super-admins from the audit log", async () => {
    const response = await request(app)
      .get("/api/v1/platform/audit")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(response.status).toBe(403);
  });
});
