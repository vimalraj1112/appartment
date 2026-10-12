import { Router } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CAPABILITIES, ROLES, can, type Capability, type Role } from "@superlink/shared";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { authenticate } from "../src/middleware/authenticate.js";
import { requirePermission } from "../src/middleware/rbac.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const CAPABILITIES_LIST = Object.keys(CAPABILITIES) as Capability[];
const ROLES_LIST = ROLES as readonly Role[];

const app = createApp({
  setup(application) {
    const probe = Router();
    probe.use(authenticate);
    for (const capability of CAPABILITIES_LIST) {
      probe.get(`/cap/${capability}`, requirePermission(capability), (_req, res) => {
        res.json({ success: true, data: { capability } });
      });
    }
    application.use("/api/v1/_probe", probe);
  },
});

const actors = {} as Record<Role, TestActor>;

beforeAll(async () => {
  const community = await createCommunity("RBAC Community");
  for (const role of ROLES_LIST) {
    actors[role] = await createActor({
      role,
      communityId: role === "SUPER_ADMIN" ? null : community.id,
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("RBAC matrix enforcement", () => {
  for (const role of ROLES_LIST) {
    it(`enforces every capability for ${role}`, async () => {
      const actor = actors[role];
      for (const capability of CAPABILITIES_LIST) {
        const response = await request(app)
          .get(`/api/v1/_probe/cap/${capability}`)
          .set("Authorization", `Bearer ${actor.accessToken}`);

        if (can(role, capability)) {
          expect(response.status, `${role} should access ${capability}`).toBe(200);
        } else {
          expect(response.status, `${role} should be blocked from ${capability}`).toBe(403);
        }
      }
    });
  }

  it("blocks anonymous access to capability-protected routes", async () => {
    const response = await request(app).get(`/api/v1/_probe/cap/${CAPABILITIES_LIST[0]}`);
    expect(response.status).toBe(401);
  });

  it("keeps security operators away from every finance capability", async () => {
    const financeCapabilities: Capability[] = [
      "FINANCE_VIEW",
      "BILLING_CONFIGURE",
      "BILL_VIEW_OWN",
      "BILL_PAY",
      "REPORTS_VIEW",
    ];
    for (const capability of financeCapabilities) {
      expect(can("SECURITY", capability)).toBe(false);
    }
  });
});