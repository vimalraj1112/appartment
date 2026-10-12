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

beforeAll(async () => {
  const community = await createCommunity("Communication Community");
  const other = await createCommunity("Communication Other");

  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });
  resident2 = await createActor({ role: "RESIDENT", communityId: community.id });
  security = await createActor({ role: "SECURITY", communityId: community.id });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("announcements", () => {
  let publishedId: string;
  let draftId: string;

  it("lets an admin publish an announcement", async () => {
    const response = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ type: "EVENT", title: `Diwali ${RUN}`, body: "Celebration at the clubhouse." });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("PUBLISHED");
    publishedId = response.body.data.id;
  });

  it("keeps drafts hidden from residents but visible to admins", async () => {
    const created = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ title: `Draft ${RUN}`, body: "Not ready", status: "DRAFT" });
    expect(created.status).toBe(200);
    draftId = created.body.data.id;

    const residentList = await request(app)
      .get("/api/v1/announcements")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(residentList.status).toBe(200);
    expect(residentList.body.data.some((a: { id: string }) => a.id === draftId)).toBe(false);

    const adminList = await request(app)
      .get("/api/v1/announcements?status=DRAFT")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(adminList.body.data.some((a: { id: string }) => a.id === draftId)).toBe(true);
  });

  it("blocks residents from publishing and lets security read", async () => {
    const forbidden = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ title: "Nope", body: "Nope" });
    expect(forbidden.status).toBe(403);

    const guardView = await request(app)
      .get("/api/v1/announcements")
      .set("Authorization", `Bearer ${security.accessToken}`);
    expect(guardView.status).toBe(200);
  });

  it("tracks acknowledgements", async () => {
    const ack = await request(app)
      .post(`/api/v1/announcements/${publishedId}/ack`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(ack.status).toBe(200);

    const detail = await request(app)
      .get(`/api/v1/announcements/${publishedId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(detail.body.data.ackCount).toBe(1);
    expect(detail.body.data.acks).toHaveLength(1);

    const mine = await request(app)
      .get(`/api/v1/announcements/${publishedId}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(mine.body.data.myAck).toBe(true);
    expect(mine.body.data.acks).toHaveLength(0);
  });

  it("will not let residents acknowledge a draft", async () => {
    const response = await request(app)
      .post(`/api/v1/announcements/${draftId}/ack`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(response.status).toBe(404);
  });

  it("returns 404 for another community's announcement", async () => {
    const response = await request(app)
      .get(`/api/v1/announcements/${publishedId}`)
      .set("Authorization", `Bearer ${otherAdmin.accessToken}`);
    expect(response.status).toBe(404);
  });

  it("lets an admin update and delete an announcement", async () => {
    const updated = await request(app)
      .patch(`/api/v1/announcements/${publishedId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ title: `Diwali ${RUN} updated` });
    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe(`Diwali ${RUN} updated`);

    const removed = await request(app)
      .delete(`/api/v1/announcements/${draftId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(removed.status).toBe(200);
  });
});

describe("community feed", () => {
  let postId: string;

  it("lets a resident post", async () => {
    const response = await request(app)
      .post("/api/v1/feed/posts")
      .set("Authorization", `Bearer ${resident.accessToken}`)
      .send({ body: `Hello neighbours ${RUN}` });
    expect(response.status).toBe(200);
    postId = response.body.data.id;
  });

  it("lets another resident comment and react (with toggle)", async () => {
    const comment = await request(app)
      .post(`/api/v1/feed/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${resident2.accessToken}`)
      .send({ body: "Looks great!" });
    expect(comment.status).toBe(200);

    const react = await request(app)
      .post(`/api/v1/feed/posts/${postId}/reactions`)
      .set("Authorization", `Bearer ${resident2.accessToken}`)
      .send({ emoji: "👍" });
    expect(react.status).toBe(200);
    expect(react.body.data.emoji).toBe("👍");

    const unreact = await request(app)
      .post(`/api/v1/feed/posts/${postId}/reactions`)
      .set("Authorization", `Bearer ${resident2.accessToken}`)
      .send({ emoji: "👍" });
    expect(unreact.body.data.emoji).toBeNull();
  });

  it("records a report once per resident", async () => {
    const first = await request(app)
      .post(`/api/v1/feed/posts/${postId}/reports`)
      .set("Authorization", `Bearer ${resident2.accessToken}`)
      .send({ reason: "Spam" });
    expect(first.status).toBe(200);

    await request(app)
      .post(`/api/v1/feed/posts/${postId}/reports`)
      .set("Authorization", `Bearer ${resident2.accessToken}`)
      .send({ reason: "Spam again" });

    expect(first.body.data.reported).toBe(true);
    expect(first.body.data.postId).toBe(postId);

    const reports = await request(app)
      .get("/api/v1/feed/reports?status=OPEN")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(reports.status).toBe(200);
    const matching = reports.body.data.filter((r: { post: { id: string } }) => r.post.id === postId);
    expect(matching).toHaveLength(1);
  });

  it("blocks residents and security from moderation", async () => {
    const asResident = await request(app)
      .get("/api/v1/feed/reports")
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(asResident.status).toBe(403);

    const asGuard = await request(app)
      .get("/api/v1/feed/posts")
      .set("Authorization", `Bearer ${security.accessToken}`);
    expect(asGuard.status).toBe(403);
  });

  it("moderates a post so it disappears for others but stays visible to its author", async () => {
    const hidden = await request(app)
      .patch(`/api/v1/feed/posts/${postId}/moderation`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "HIDDEN", reason: "Spam" });
    expect(hidden.status).toBe(200);

    const otherList = await request(app)
      .get("/api/v1/feed/posts")
      .set("Authorization", `Bearer ${resident2.accessToken}`);
    expect(otherList.body.data.some((p: { id: string }) => p.id === postId)).toBe(false);

    const authorView = await request(app)
      .get(`/api/v1/feed/posts/${postId}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(authorView.status).toBe(200);

    const otherView = await request(app)
      .get(`/api/v1/feed/posts/${postId}`)
      .set("Authorization", `Bearer ${resident2.accessToken}`);
    expect(otherView.status).toBe(404);
  });

  it("resolves reports", async () => {
    const reports = await request(app)
      .get("/api/v1/feed/reports?status=OPEN")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    const reportId = reports.body.data[0].id;

    const resolved = await request(app)
      .patch(`/api/v1/feed/reports/${reportId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "RESOLVED" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe("RESOLVED");
  });
});
