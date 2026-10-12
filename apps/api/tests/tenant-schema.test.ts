import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TENANT_MODELS } from "../src/config/prisma.js";

/**
 * Models that store a `communityId` but are intentionally NOT auto-scoped.
 * AuditLog is a global, append-only ledger; it records communityId explicitly.
 */
const EXCLUDED_FROM_SCOPING = new Set(["AuditLog"]);

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

const modelsWithCommunityId = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)]
  .filter((match) => /(^|\n)\s*communityId\s+String/.test(match[2] ?? ""))
  .map((match) => match[1] as string);

describe("tenant scoping registry stays in sync with the schema", () => {
  it("found the expected models carrying communityId", () => {
    expect(modelsWithCommunityId.length).toBeGreaterThan(0);
  });

  it("every communityId model is either auto-scoped or explicitly excluded", () => {
    for (const model of modelsWithCommunityId) {
      if (EXCLUDED_FROM_SCOPING.has(model)) continue;
      expect(TENANT_MODELS.has(model), `${model} must be listed in TENANT_MODELS`).toBe(true);
    }
  });

  it("does not list models that do not carry communityId", () => {
    for (const model of TENANT_MODELS) {
      expect(
        modelsWithCommunityId.includes(model),
        `${model} is scoped but has no communityId column`,
      ).toBe(true);
    }
  });
});