import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("hardening: health probes", () => {
  it("returns ok from /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: "ok" } });
  });

  it("returns liveness from /health/live", async () => {
    const res = await request(app).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: "ok" } });
  });

  it("returns readiness with database check from /health/ready", async () => {
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: "ok", db: "ok" } });
  });
});

describe("hardening: error envelope", () => {
  it("returns a shaped 404 for unknown endpoints", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
  });

  it("rejects malformed JSON with 400 instead of leaking a 500", async () => {
    const res = await request(app)
      .post("/health")
      .set("Content-Type", "application/json")
      .send("{ not: valid json ");
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: "INVALID_JSON" } });
  });

  it("rejects oversized payloads with 413", async () => {
    const big = "a".repeat(300 * 1024);
    const res = await request(app)
      .post("/health")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ blob: big }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("hardening: security headers", () => {
  it("sets baseline helmet headers", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-dns-prefetch-control"]).toBe("off");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
