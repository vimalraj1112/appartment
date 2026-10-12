import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();

let admin: TestActor;
let resident: TestActor;
let otherAdmin: TestActor;

beforeAll(async () => {
  const community = await createCommunity("Notifications Community");
  const other = await createCommunity("Notifications Other");
  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function send(toUserId: string, token: string, title: string) {
  return request(app)
    .post("/api/v1/notifications/send")
    .set("Authorization", `Bearer ${token}`)
    .send({ userId: toUserId, type: "GENERAL", title, body: `${title} body` });
}

describe("notifications", () => {
  it("starts empty for a fresh resident", async () => {
    const response = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${resident.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);

    const count = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(count.body.data.count).toBe(0);
  });

  it("lets an admin send and the resident receive a notification", async () => {
    const created = await send(resident.id, admin.accessToken, "Welcome home");
    expect(created.status).toBe(200);
    expect(created.body.data.title).toBe("Welcome home");

    const count = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(count.body.data.count).toBe(1);

    const list = await request(app)
      .get("/api/v1/notifications?unreadOnly=true")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].readAt).toBeNull();
  });

  it("marks a notification read and reports zero unread", async () => {
    const list = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    const id = list.body.data[0].id;

    const read = await request(app)
      .post(`/api/v1/notifications/${id}/read`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(read.status).toBe(200);

    const count = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(count.body.data.count).toBe(0);
  });

  it("marks all read", async () => {
    await send(resident.id, admin.accessToken, "Second");
    await send(resident.id, admin.accessToken, "Third");

    const all = await request(app)
      .post("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(all.status).toBe(200);

    const count = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(count.body.data.count).toBe(0);
  });

  it("forbids residents from sending notifications", async () => {
    const response = await send(resident.id, resident.accessToken, "Nope");
    expect(response.status).toBe(403);
  });

  it("stops an admin from notifying another community's resident", async () => {
    const response = await send(resident.id, otherAdmin.accessToken, "Cross tenant");
    expect(response.status).toBe(403);
  });

  it("only returns the caller's own notifications", async () => {
    await send(admin.id, admin.accessToken, "Admin only");

    const residentList = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${resident.accessToken}`);

    expect(residentList.body.data.every((n: { title: string }) => n.title !== "Admin only")).toBe(true);
  });
});
