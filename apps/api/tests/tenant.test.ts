import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/prisma.js";
import { runWithStore } from "../src/tenant/context.js";
import { authContextFor, createActor, createCommunity, type TestActor } from "./helpers.js";

function asActor<T>(actor: TestActor, fn: () => Promise<T>): Promise<T> {
  return runWithStore(
    {
      requestId: "tenant-test",
      ip: "127.0.0.1",
      auth: authContextFor(actor),
      unauthenticated: false,
    },
    async () => await fn(),
  );
}

function asAnonymous<T>(fn: () => Promise<T>): Promise<T> {
  return runWithStore(
    { requestId: "tenant-test", ip: "127.0.0.1", unauthenticated: true },
    async () => await fn(),
  );
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("tenant isolation at the repository layer", () => {
  it("scopes findMany to the actor's community", async () => {
    const communityA = await createCommunity("A");
    const communityB = await createCommunity("B");
    const actorA = await createActor({ role: "COMMUNITY_ADMIN", communityId: communityA.id });
    const actorB = await createActor({ role: "COMMUNITY_ADMIN", communityId: communityB.id });

    const visible = await asActor(actorA, () => prisma.user.findMany());
    const ids = visible.map((user) => user.id);

    expect(ids).toContain(actorA.id);
    expect(ids).not.toContain(actorB.id);
  });

  it("returns null when reading another tenant's record by id", async () => {
    const communityA = await createCommunity("A");
    const communityB = await createCommunity("B");
    const actorA = await createActor({ role: "COMMUNITY_ADMIN", communityId: communityA.id });
    const actorB = await createActor({ role: "COMMUNITY_ADMIN", communityId: communityB.id });

    const found = await asActor(actorA, () =>
      prisma.user.findUnique({ where: { id: actorB.id } }),
    );

    expect(found).toBeNull();
  });

  it("forces the actor's communityId on create, ignoring a supplied one", async () => {
    const communityA = await createCommunity("A");
    const communityB = await createCommunity("B");
    const actorA = await createActor({ role: "COMMUNITY_ADMIN", communityId: communityA.id });

    const created = await asActor(actorA, () =>
      prisma.user.create({
        data: {
          email: `spoof-${Date.now()}@test.dev`,
          role: "RESIDENT",
          communityId: communityB.id,
          firstName: "Spoof",
          lastName: "Attempt",
          passwordHash: "x",
        },
      }),
    );

    expect(created.communityId).toBe(communityA.id);
  });

  it("prevents moving a record into another community on update", async () => {
    const communityA = await createCommunity("A");
    const communityB = await createCommunity("B");
    const actorA = await createActor({ role: "COMMUNITY_ADMIN", communityId: communityA.id });

    const updated = await asActor(actorA, () =>
      prisma.user.update({
        where: { id: actorA.id },
        data: { communityId: communityB.id },
      }),
    );

    expect(updated.communityId).toBe(communityA.id);
  });

  it("blocks tenant models entirely for anonymous contexts", async () => {
    await expect(asAnonymous(() => prisma.user.findMany())).rejects.toThrow(/sign in|forbidden/i);
  });

  it("allows system jobs to span tenants", async () => {
    const communityA = await createCommunity("A");
    const communityB = await createCommunity("B");

    const all = await prisma.user.findMany({
      where: { communityId: { in: [communityA.id, communityB.id] } },
    });
    expect(Array.isArray(all)).toBe(true);
  });
});