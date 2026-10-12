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

function get(path: string, actor: TestActor) {
  return request(app).get(path).set("Authorization", `Bearer ${actor.accessToken}`);
}

function post(path: string, actor: TestActor, body: object = {}) {
  return request(app).post(path).set("Authorization", `Bearer ${actor.accessToken}`).send(body);
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function newConversation(actor: TestActor): Promise<string> {
  const response = await post("/api/v1/ai/conversations", actor, {});
  expect(response.status).toBe(200);
  return response.body.data.id as string;
}

beforeAll(async () => {
  const community = await createCommunity("AI Community");
  communityId = community.id;
  const other = await createCommunity("AI Other");

  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId });
  resident = await createActor({ role: "RESIDENT", communityId });
  security = await createActor({ role: "SECURITY", communityId });
  staff = await createActor({ role: "STAFF", communityId });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });

  const building = await prisma.building.create({
    data: { communityId, name: `AI-${RUN}`, towerCode: `AI${RUN}` },
  });
  const floor = await prisma.floor.create({
    data: { communityId, buildingId: building.id, label: "1", number: 1 },
  });
  const flat = await prisma.flat.create({
    data: { communityId, floorId: floor.id, code: `AI1-${RUN}`, type: "2BHK", status: "OCCUPIED" },
  });
  await prisma.flatOccupant.create({
    data: {
      communityId,
      flatId: flat.id,
      userId: resident.id,
      relation: "OWNER",
      isPrimary: true,
      movedInAt: new Date(),
    },
  });

  await prisma.maintenanceBill.create({
    data: {
      communityId,
      flatId: flat.id,
      period: currentPeriod(),
      totalInr: 2500,
      status: "PENDING",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const visitor = await prisma.visitor.create({
    data: { communityId, name: `Guest ${RUN}`, phone: "9000000001", flatId: flat.id },
  });
  await prisma.visitorPass.create({
    data: {
      communityId,
      visitorId: visitor.id,
      flatId: flat.id,
      code: `AIP-${RUN}`,
      qrTokenHash: `aip-${RUN}`,
      status: "PENDING",
    },
  });

  const amenity = await prisma.amenity.create({
    data: { communityId, name: `Clubhouse ${RUN}` },
  });
  await prisma.amenityBooking.create({
    data: {
      communityId,
      amenityId: amenity.id,
      flatId: flat.id,
      userId: resident.id,
      date: new Date(),
      slotStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
      slotEnd: new Date(Date.now() + 25 * 60 * 60 * 1000),
      status: "BOOKED",
    },
  });

  await prisma.complaint.create({
    data: {
      communityId,
      raisedById: resident.id,
      flatId: flat.id,
      title: "Dripping tap",
      description: "The kitchen tap keeps dripping.",
      status: "OPEN",
      priority: "MEDIUM",
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("AI assistant conversations", () => {
  it("creates and lists conversations for the caller", async () => {
    const id = await newConversation(resident);
    const list = await get("/api/v1/ai/conversations", resident);
    expect(list.status).toBe(200);
    expect(list.body.data.some((row: { id: string }) => row.id === id)).toBe(true);
  });

  it("rejects empty messages", async () => {
    const id = await newConversation(resident);
    const response = await post(`/api/v1/ai/conversations/${id}/messages`, resident, { content: "  " });
    expect(response.status).toBe(400);
  });

  it("keeps conversations private to their owner", async () => {
    const id = await newConversation(admin);
    const response = await get(`/api/v1/ai/conversations/${id}`, otherAdmin);
    expect(response.status).toBe(404);
  });

  it("deletes a conversation", async () => {
    const id = await newConversation(resident);
    const del = await request(app)
      .delete(`/api/v1/ai/conversations/${id}`)
      .set("Authorization", `Bearer ${resident.accessToken}`);
    expect(del.status).toBe(200);
    const after = await get(`/api/v1/ai/conversations/${id}`, resident);
    expect(after.status).toBe(404);
  });
});

describe("AI assistant tools", () => {
  it("exposes community tools to admins and help tools to everyone", async () => {
    const response = await get("/api/v1/ai/tools", admin);
    expect(response.status).toBe(200);
    const names = response.body.data.map((tool: { name: string }) => tool.name);
    expect(names).toContain("community_overview");
    expect(names).toContain("help_topics");
  });

  it("gives residents own-data tools but not community tools", async () => {
    const response = await get("/api/v1/ai/tools", resident);
    const names = response.body.data.map((tool: { name: string }) => tool.name);
    expect(names).toContain("my_bills");
    expect(names).not.toContain("community_overview");
  });

  it("gives security and staff help content only", async () => {
    for (const actor of [security, staff]) {
      const response = await get("/api/v1/ai/tools", actor);
      expect(response.status).toBe(200);
      const names = response.body.data.map((tool: { name: string }) => tool.name);
      expect(names).toEqual(["help_topics"]);
    }
  });

  it("runs a community tool for an admin and logs the call", async () => {
    const id = await newConversation(admin);
    const response = await post(`/api/v1/ai/conversations/${id}/messages`, admin, {
      content: "Give me a community overview",
    });
    expect(response.status).toBe(200);
    const messages = response.body.data.messages as Array<{ role: string; toolName?: string; content: string }>;
    const tool = messages.find((message) => message.role === "TOOL");
    expect(tool?.toolName).toBe("community_overview");
    const assistant = messages.find((message) => message.role === "ASSISTANT");
    expect(assistant?.content).toContain("Occupancy");

    const log = await prisma.aiToolCall.findFirst({
      where: { userId: admin.id, tool: "community_overview" },
    });
    expect(log?.ok).toBe(true);
  });

  it("runs an own-data tool for a resident", async () => {
    const id = await newConversation(resident);
    const response = await post(`/api/v1/ai/conversations/${id}/messages`, resident, {
      content: "What are my bills?",
    });
    const messages = response.body.data.messages as Array<{ role: string; toolName?: string; content: string }>;
    const tool = messages.find((message) => message.role === "TOOL");
    expect(tool?.toolName).toBe("my_bills");
    expect(tool?.content).toContain("2,500");
  });

  it("falls back to guidance without a tool when nothing matches", async () => {
    const id = await newConversation(security);
    const response = await post(`/api/v1/ai/conversations/${id}/messages`, security, {
      content: "Sing me a song",
    });
    expect(response.status).toBe(200);
    const messages = response.body.data.messages as Array<{ role: string }>;
    expect(messages.some((message) => message.role === "TOOL")).toBe(false);
    expect(messages.at(-1)?.role).toBe("ASSISTANT");
  });
});

describe("AI weekly digest", () => {
  it("returns a digest for community admins", async () => {
    const response = await get("/api/v1/ai/digest", admin);
    expect(response.status).toBe(200);
    expect(response.body.data.summary).toContain("occupancy");
    expect(Array.isArray(response.body.data.highlights)).toBe(true);
    expect(response.body.data.metrics).toHaveProperty("occupancyRate");
  });

  it("blocks residents from the digest", async () => {
    const response = await get("/api/v1/ai/digest", resident);
    expect(response.status).toBe(403);
  });
});
