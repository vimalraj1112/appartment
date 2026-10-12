import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { clearSentEmails, sentEmails } from "../src/services/mailer.js";
import { createActor, createCommunity, TEST_PASSWORD, type TestActor } from "./helpers.js";

const app = createApp();

function refreshTokenFrom(response: request.Response): string | null {
  const header = response.headers["set-cookie"];
  if (!header) return null;
  const cookies = Array.isArray(header) ? header : [header];
  const match = cookies.find((cookie) => cookie.startsWith("sl_refresh="));
  if (!match) return null;
  return match.split(";")[0].split("=")[1];
}

function metaEmail(meta: unknown): string | undefined {
  return (meta as { email?: string } | null)?.email;
}

let actor: TestActor;
let communityId: string;

beforeAll(async () => {
  const community = await createCommunity("Auth Community");
  communityId = community.id;
  actor = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("authentication", () => {
  it("logs in with valid credentials and issues a refresh cookie", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: actor.email, password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.user.email).toBe(actor.email);
    expect(refreshTokenFrom(response)).toBeTruthy();
  });

  it("rejects invalid passwords and records an audit event", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: actor.email, password: "definitely-wrong" });

    expect(response.status).toBe(401);

    const audit = await prisma.auditLog.findMany({ where: { action: "AUTH.LOGIN_FAILED" } });
    expect(audit.some((row) => metaEmail(row.meta) === actor.email)).toBe(true);
  });

  it("returns the current user for a valid access token", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${actor.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(actor.email);
  });

  it("rejects missing access tokens", async () => {
    const response = await request(app).get("/api/v1/auth/me");
    expect(response.status).toBe(401);
  });

  it("rotates the refresh token and detects reuse", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: actor.email, password: TEST_PASSWORD });
    const firstToken = refreshTokenFrom(login);
    expect(firstToken).toBeTruthy();

    const first = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `sl_refresh=${firstToken as string}`);
    expect(first.status).toBe(200);

    const reuse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `sl_refresh=${firstToken as string}`);
    expect(reuse.status).toBe(401);

    const audit = await prisma.auditLog.findMany({ where: { action: "AUTH.REFRESH_REUSE_DETECTED" } });
    expect(audit.length).toBeGreaterThan(0);
  });

  it("invalidates a session on logout", async () => {
    const agent = request.agent(app);
    const login = await agent
      .post("/api/v1/auth/login")
      .send({ email: actor.email, password: TEST_PASSWORD });
    expect(login.status).toBe(200);

    const logout = await agent.post("/api/v1/auth/logout");
    expect(logout.status).toBe(200);

    const afterLogout = await agent.post("/api/v1/auth/refresh");
    expect(afterLogout.status).toBe(401);
  });

  it("completes the password reset flow", async () => {
    const community = await createCommunity("Reset Community");
    const resetActor = await createActor({
      role: "RESIDENT",
      communityId: community.id,
    });

    clearSentEmails();
    const forgot = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: resetActor.email });
    expect(forgot.status).toBe(200);

    const email = sentEmails.at(-1);
    expect(email).toBeTruthy();
    const tokenMatch = /token=([\w-]+)/.exec(email?.text ?? "");
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch?.[1] as string;

    const reset = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "BrandNewPass123" });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: resetActor.email, password: TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: resetActor.email, password: "BrandNewPass123" });
    expect(newLogin.status).toBe(200);
  });

  it("forgets the community association only for super admins", async () => {
    const superActor = await createActor({ role: "SUPER_ADMIN", communityId: null });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${superActor.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.communityId).toBeNull();
  });

  it("stores the community id on the audit trail for this community", async () => {
    const rows = await prisma.auditLog.findMany({
      where: { action: "AUTH.LOGIN" },
    });
    expect(rows.some((row) => row.communityId === communityId && row.userId === actor.id)).toBe(true);
  });
});
