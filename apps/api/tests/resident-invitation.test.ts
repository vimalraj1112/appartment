import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { clearSentEmails, sentEmails } from "../src/services/mailer.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();
const RUN = randomUUID().slice(0, 8);
const residentEmail = `new-resident-${RUN}@test.dev`;
const scopedEmail = `scoped-${RUN}@test.dev`;
const invitedEmail = `invited-${RUN}@test.dev`;

let admin: TestActor;
let otherAdmin: TestActor;
let communityId: string;
let flatId: string;

beforeAll(async () => {
  const community = await createCommunity("Residents Community");
  communityId = community.id;
  const other = await createCommunity("Residents Other");
  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });

  const building = await prisma.building.create({
    data: { communityId, name: "Tower R", floorsCount: 1 },
  });
  const floor = await prisma.floor.create({
    data: { communityId, buildingId: building.id, number: 1, label: "Floor 1" },
  });
  const flat = await prisma.flat.create({
    data: { communityId, floorId: floor.id, code: "R-101" },
  });
  flatId = flat.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("residents", () => {
  it("creates a resident and assigns a flat", async () => {
    const response = await request(app)
      .post("/api/v1/residents")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        email: residentEmail,
        firstName: "New",
        lastName: "Resident",
        flatId,
        relation: "OWNER",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("INVITED");
    expect(response.body.data.flatOccupancies[0].flat.code).toBe("R-101");

    const flat = await prisma.flat.findUnique({ where: { id: flatId } });
    expect(flat?.status).toBe("OCCUPIED");
  });

  it("lists residents scoped to the community", async () => {
    const response = await request(app)
      .get("/api/v1/residents?q=New")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((r: { role: string }) => r.role === "RESIDENT")).toBe(true);
  });

  it("hides residents from other communities via 404", async () => {
    const created = await request(app)
      .post("/api/v1/residents")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ email: scopedEmail, firstName: "Scoped", lastName: "Person" });
    const id = created.body.data.id;

    const response = await request(app)
      .get(`/api/v1/residents/${id}`)
      .set("Authorization", `Bearer ${otherAdmin.accessToken}`);

    expect(response.status).toBe(404);
  });
});

describe("invitations", () => {
  it("creates an invitation, exposes it publicly, and accepts it", async () => {
    clearSentEmails();
    const create = await request(app)
      .post("/api/v1/invitations")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ email: invitedEmail, role: "RESIDENT", flatId });

    expect(create.status).toBe(200);
    expect(sentEmails).toHaveLength(1);

    const token = /token=([^&\s]+)/.exec(sentEmails[0]?.text ?? "")?.[1];
    expect(token).toBeTruthy();
    if (!token) throw new Error("invitation token missing");

    const preview = await request(app).get(`/api/v1/invitations/public/${token}`);
    expect(preview.status).toBe(200);
    expect(preview.body.data.valid).toBe(true);
    expect(preview.body.data.communityName).toBe("Residents Community");

    const accept = await request(app)
      .post("/api/v1/invitations/accept")
      .send({ token, firstName: "Invited", lastName: "User", password: "Password123!" });

    expect(accept.status).toBe(200);
    expect(accept.body.data.user.status).toBe("ACTIVE");

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: invitedEmail, password: "Password123!" });

    expect(login.status).toBe(200);
  });

  it("rejects an unknown invitation token", async () => {
    const response = await request(app).get("/api/v1/invitations/public/not-a-real-token");
    expect(response.status).toBe(404);
  });
});

describe("onboarding", () => {
  it("tracks the onboarding step and structure counts", async () => {
    const response = await request(app)
      .get("/api/v1/onboarding")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.counts.flats).toBeGreaterThan(0);

    const updated = await request(app)
      .patch("/api/v1/onboarding")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ step: 3 });

    expect(updated.status).toBe(200);
    expect(updated.body.data.step).toBe(3);
  });
});
