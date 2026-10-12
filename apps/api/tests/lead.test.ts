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
  const community = await createCommunity("Leads Community");
  superAdmin = await createActor({ role: "SUPER_ADMIN", communityId: null });
  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("public demo leads", () => {
  it("accepts a valid demo request without authentication", async () => {
    const response = await request(app).post("/api/v1/leads").send({
      name: `Prospect ${RUN}`,
      email: `prospect-${RUN}@example.com`,
      phone: "9876543210",
      communityName: `Sunrise Heights ${RUN}`,
      flats: 120,
      message: "We would like a walkthrough.",
    });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("NEW");

    const stored = await prisma.demoLead.findUnique({ where: { id: response.body.data.id } });
    expect(stored?.communityName).toBe(`Sunrise Heights ${RUN}`);
  });

  it("rejects an invalid submission", async () => {
    const response = await request(app).post("/api/v1/leads").send({ name: "", email: "not-an-email" });
    expect(response.status).toBe(400);
  });
});

describe("platform lead management", () => {
  it("lists leads for super admins", async () => {
    const response = await request(app)
      .get(`/api/v1/platform/leads?q=Sunrise%20Heights`)
      .set("Authorization", `Bearer ${superAdmin.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.meta).toHaveProperty("total");
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it("updates lead status", async () => {
    const created = await request(app).post("/api/v1/leads").send({
      name: `Follow Up ${RUN}`,
      email: `followup-${RUN}@example.com`,
      phone: "9998887776",
      communityName: `Palm Grove ${RUN}`,
    });
    const id = created.body.data.id as string;

    const updated = await request(app)
      .patch(`/api/v1/platform/leads/${id}`)
      .set("Authorization", `Bearer ${superAdmin.accessToken}`)
      .send({ status: "CONVERTED" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe("CONVERTED");
  });

  it("blocks community admins", async () => {
    const response = await request(app)
      .get("/api/v1/platform/leads")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(response.status).toBe(403);
  });
});
