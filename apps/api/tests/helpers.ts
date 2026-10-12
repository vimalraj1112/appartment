import argon2 from "argon2";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Role, UserStatus } from "@superlink/shared";
import { prisma } from "../src/config/prisma.js";
import { signAccessToken } from "../src/services/token.service.js";
import type { AuthContext } from "../src/tenant/context.js";

export const TEST_PASSWORD = "Password123!";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createCommunity(name = "Test Community") {
  return prisma.community.create({
    data: { name, slug: `test-${randomUUID()}` },
  });
}

export interface TestActor {
  id: string;
  email: string;
  role: Role;
  communityId: string | null;
  status: UserStatus;
  password: string;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export async function createActor(input: {
  role: Role;
  communityId: string | null;
  password?: string;
  status?: UserStatus;
  email?: string;
}): Promise<TestActor> {
  const password = input.password ?? TEST_PASSWORD;
  const email = input.email ?? `${input.role.toLowerCase()}-${randomUUID()}@test.dev`;
  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      email,
      role: input.role,
      communityId: input.communityId,
      firstName: "Test",
      lastName: input.role,
      passwordHash,
      status: input.status ?? "ACTIVE",
    },
  });

  const refreshToken = randomBytes(32).toString("base64url");
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    communityId: user.communityId,
    sessionId: session.id,
  });

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    communityId: user.communityId,
    status: user.status,
    password,
    accessToken,
    refreshToken,
    sessionId: session.id,
  };
}

export function authContextFor(actor: TestActor): AuthContext {
  return {
    userId: actor.id,
    communityId: actor.communityId,
    role: actor.role,
    sessionId: actor.sessionId,
    bypass: false,
  };
}