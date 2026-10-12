import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();

let admin: TestActor;
let otherAdmin: TestActor;
let resident: TestActor;
let buildingId: string;
let floorId: string;

beforeAll(async () => {
  const community = await createCommunity("Structure Community");
  const other = await createCommunity("Other Community");
  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  otherAdmin = await createActor({ role: "COMMUNITY_ADMIN", communityId: other.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("structure: buildings & floors", () => {
  it("creates a building", async () => {
    const response = await request(app)
      .post("/api/v1/structure/buildings")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ name: "Tower A", towerCode: "A", floorsCount: 3 });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Tower A");
    buildingId = response.body.data.id;
  });

  it("lists buildings with counts", async () => {
    const response = await request(app)
      .get("/api/v1/structure/buildings")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.some((b: { id: string }) => b.id === buildingId)).toBe(true);
  });

  it("creates floors under the building", async () => {
    const response = await request(app)
      .post(`/api/v1/structure/buildings/${buildingId}/floors`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ number: 1, label: "First Floor" });

    expect(response.status).toBe(200);
    floorId = response.body.data.id;
  });

  it("hides buildings from other communities", async () => {
    const response = await request(app)
      .get(`/api/v1/structure/buildings/${buildingId}`)
      .set("Authorization", `Bearer ${otherAdmin.accessToken}`);

    expect(response.status).toBe(404);
  });

  it("forbids residents from managing structure", async () => {
    const response = await request(app)
      .get("/api/v1/structure/buildings")
      .set("Authorization", `Bearer ${resident.accessToken}`);

    expect(response.status).toBe(403);
  });
});

describe("structure: flats", () => {
  it("bulk creates flats and reports skips on duplicate codes", async () => {
    const first = await request(app)
      .post("/api/v1/structure/flats/bulk")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ floorId, prefix: "A-", start: 101, count: 4, pad: 2 });

    expect(first.status).toBe(200);
    expect(first.body.data.created).toBe(4);

    const second = await request(app)
      .post("/api/v1/structure/flats/bulk")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ floorId, prefix: "A-", start: 101, count: 2, pad: 2 });

    expect(second.status).toBe(200);
    expect(second.body.data.created).toBe(0);
    expect(second.body.data.skipped).toBe(2);
  });

  it("paginates and filters flats", async () => {
    const response = await request(app)
      .get("/api/v1/structure/flats?limit=2&page=1")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.total).toBe(4);
  });

  it("returns a flat with its floor and building", async () => {
    const list = await request(app)
      .get("/api/v1/structure/flats?q=A-101")
      .set("Authorization", `Bearer ${admin.accessToken}`);
    const flatId = list.body.data[0].id;

    const response = await request(app)
      .get(`/api/v1/structure/flats/${flatId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.floor.building.name).toBe("Tower A");
  });

  it("rejects a flat in another community's floor", async () => {
    const response = await request(app)
      .post("/api/v1/structure/flats")
      .set("Authorization", `Bearer ${otherAdmin.accessToken}`)
      .send({ floorId, code: "X-999" });

    expect(response.status).toBe(404);
  });

  it("conflicts on a duplicate flat code", async () => {
    const response = await request(app)
      .post("/api/v1/structure/flats")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ floorId, code: "A-101" });

    expect(response.status).toBe(409);
  });
});
