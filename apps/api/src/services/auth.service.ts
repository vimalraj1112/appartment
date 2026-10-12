import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import type { Role, UserStatus } from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { runAsSystem } from "../tenant/context.js";
import { writeAudit } from "./audit.service.js";
import { signAccessToken } from "./token.service.js";
import { sendEmail } from "./mailer.js";

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  communityId: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  phone: string | null;
}

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  communityId: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  phone: string | null;
  passwordHash: string;
  deletedAt: Date | null;
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    communityId: user.communityId,
    avatarUrl: user.avatarUrl,
    status: user.status,
    phone: user.phone,
  };
}

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_COOKIE_DAYS * 24 * 60 * 60 * 1000);
}

async function issueSession(user: {
  id: string;
  role: Role;
  communityId: string | null;
}, meta: { ip?: string; userAgent?: string }): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshToken = randomBytes(48).toString("base64url");
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiry(),
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    communityId: user.communityId,
    sessionId: session.id,
  });
  return { accessToken, refreshToken };
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function login(input: {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  const email = input.email.trim().toLowerCase();

  const user = await runAsSystem(() =>
    prisma.user.findUnique({ where: { email }, include: { community: true } }),
  );

  const invalid = AppError.unauthorized("Invalid email or password.");

  if (!user || user.deletedAt) {
    await writeAudit({ action: "AUTH.LOGIN_FAILED", meta: { email }, ip: input.ip });
    throw invalid;
  }

  const valid = await argon2.verify(user.passwordHash, input.password).catch(() => false);
  if (!valid) {
    await writeAudit({
      action: "AUTH.LOGIN_FAILED",
      meta: { email },
      ip: input.ip,
      userId: user.id,
      communityId: user.communityId,
    });
    throw invalid;
  }

  if (user.status !== "ACTIVE") {
    await writeAudit({
      action: "AUTH.LOGIN_BLOCKED",
      meta: { email, reason: user.status },
      ip: input.ip,
      userId: user.id,
      communityId: user.communityId,
    });
    throw AppError.forbidden("Your account is not active. Please contact your community admin.");
  }

  const { accessToken, refreshToken } = await issueSession(user, {
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await runAsSystem(() =>
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  );

  await writeAudit({
    action: "AUTH.LOGIN",
    ip: input.ip,
    userId: user.id,
    communityId: user.communityId,
  });

  return { user: toPublicUser(user), accessToken, refreshToken };
}

export async function refresh(input: {
  refreshToken: string | undefined;
  ip?: string;
  userAgent?: string;
}): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  const unauthorized = AppError.unauthorized("Your session has expired. Please sign in again.");

  if (!input.refreshToken) throw unauthorized;

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashToken(input.refreshToken) },
    include: { user: true },
  });

  if (!session) throw unauthorized;

  if (session.revokedAt) {
    await revokeAllSessions(session.userId);
    await writeAudit({
      action: "AUTH.REFRESH_REUSE_DETECTED",
      meta: { sessionId: session.id },
      ip: input.ip,
      userId: session.userId,
      communityId: session.user.communityId,
    });
    throw AppError.unauthorized("Your session was revoked for security. Please sign in again.");
  }

  if (session.expiresAt.getTime() < Date.now()) throw unauthorized;

  const user = session.user;
  if (user.deletedAt || user.status !== "ACTIVE") throw unauthorized;

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueSession(user, { ip: input.ip, userAgent: input.userAgent });
  return { user: toPublicUser(user), ...tokens };
}

export async function logout(input: { refreshToken: string | undefined; ip?: string }): Promise<void> {
  if (!input.refreshToken) return;
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashToken(input.refreshToken) },
    include: { user: true },
  });
  if (!session || session.revokedAt) return;

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });
  await writeAudit({
    action: "AUTH.LOGOUT",
    ip: input.ip,
    userId: session.userId,
    communityId: session.user.communityId,
  });
}

export async function logoutAll(input: { userId: string; ip?: string }): Promise<void> {
  await revokeAllSessions(input.userId);
  await writeAudit({ action: "AUTH.LOGOUT_ALL", ip: input.ip });
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) throw AppError.unauthorized();
  return toPublicUser(user);
}

export async function forgotPassword(input: { email: string; ip?: string }): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const user = await runAsSystem(() => prisma.user.findUnique({ where: { email } }));

  if (!user || user.deletedAt || user.status !== "ACTIVE") return;

  const token = randomBytes(32).toString("base64url");
  await runAsSystem(() =>
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetHash: hashToken(token),
        passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    }),
  );

  const link = `${env.WEB_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your SuperLink Community password",
    text: `Hi ${user.firstName}, reset your password within the next hour: ${link}\nIf you didn't request this, you can safely ignore this email.`,
  });

  await writeAudit({
    action: "AUTH.PASSWORD_RESET_REQUESTED",
    meta: { email },
    ip: input.ip,
    userId: user.id,
    communityId: user.communityId,
  });
}

export async function resetPassword(input: {
  token: string;
  password: string;
  ip?: string;
}): Promise<void> {
  const user = await runAsSystem(() =>
    prisma.user.findFirst({
      where: {
        passwordResetHash: hashToken(input.token),
        passwordResetExpiresAt: { gt: new Date() },
        deletedAt: null,
      },
    }),
  );

  if (!user) {
    throw AppError.unauthorized("This reset link is invalid or has expired.");
  }

  const passwordHash = await argon2.hash(input.password);
  await runAsSystem(() =>
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetHash: null, passwordResetExpiresAt: null },
    }),
  );
  await revokeAllSessions(user.id);

  await writeAudit({
    action: "AUTH.PASSWORD_RESET",
    ip: input.ip,
    userId: user.id,
    communityId: user.communityId,
  });
}
