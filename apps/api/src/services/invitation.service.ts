import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import type { AcceptInvitationInput, InvitationCreateInput, Role } from "@superlink/shared";
import { INVITATION_TTL_DAYS } from "@superlink/shared";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { runAsSystem } from "../tenant/context.js";
import { writeAudit } from "./audit.service.js";
import { sendEmail } from "./mailer.js";
import { toPublicUser } from "./auth.service.js";

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

function expiryDate(): Date {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function listInvitations() {
  return prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      invitedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function createInvitation(
  actorId: string,
  input: InvitationCreateInput & { ip?: string },
) {
  const email = input.email?.trim().toLowerCase() ?? null;
  const phone = input.phone?.trim() ?? null;

  if (input.flatId) {
    const flat = await prisma.flat.findFirst({
      where: { id: input.flatId, deletedAt: null },
      select: { id: true },
    });
    if (!flat) throw AppError.notFound("We could not find that flat.");
  }

  const token = randomBytes(32).toString("base64url");
  const invitation = await prisma.invitation.create({
    data: {
      communityId: "",
      email,
      phone,
      role: input.role,
      flatId: input.flatId ?? null,
      invitedById: actorId,
      tokenHash: hashToken(token),
      expiresAt: expiryDate(),
    },
  });

  const acceptUrl = `${env.WEB_URL}/accept-invite?token=${token}`;
  if (email) {
    await sendEmail({
      to: email,
      subject: "You're invited to SuperLink Community",
      text: `You've been invited as a ${input.role.toLowerCase().replace(/_/g, " ")}. Accept within ${INVITATION_TTL_DAYS} days: ${acceptUrl}`,
    });
  }

  await writeAudit({
    action: "INVITATION.CREATE",
    resource: "Invitation",
    resourceId: invitation.id,
    meta: { email, phone, role: input.role },
    ip: input.ip,
  });

  return { invitation, acceptUrl };
}

export async function revokeInvitation(id: string) {
  const invitation = await prisma.invitation.findFirst({ where: { id } });
  if (!invitation) throw AppError.notFound("We could not find that invitation.");

  await prisma.invitation.delete({ where: { id } });
  await writeAudit({ action: "INVITATION.REVOKE", resource: "Invitation", resourceId: id });
}

export interface PublicInvitation {
  email: string | null;
  role: Role;
  communityName: string;
  expiresAt: Date;
  valid: boolean;
}

export async function getPublicInvitation(token: string): Promise<PublicInvitation> {
  const record = await runAsSystem(() =>
    prisma.invitation.findFirst({
      where: { tokenHash: hashToken(token) },
      include: { community: { select: { name: true } } },
    }),
  );

  if (!record) throw AppError.notFound("This invitation is invalid or has expired.");

  const valid = !record.acceptedAt && record.expiresAt > new Date();
  return {
    email: record.email,
    role: record.role,
    communityName: record.community?.name ?? "",
    expiresAt: record.expiresAt,
    valid,
  };
}

export async function acceptInvitation(input: AcceptInvitationInput, ip?: string) {
  const record = await runAsSystem(() =>
    prisma.invitation.findFirst({
      where: {
        tokenHash: hashToken(input.token),
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  );

  if (!record || !record.email) {
    throw AppError.unauthorized("This invitation is invalid or has expired.");
  }

  const email = record.email.toLowerCase();
  const passwordHash = await argon2.hash(input.password);

  const user = await runAsSystem(async () => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.communityId && existing.communityId !== record.communityId) {
      throw AppError.conflict("That email already belongs to another community.");
    }

    const saved = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            communityId: record.communityId,
            role: record.role,
            status: "ACTIVE",
            firstName: input.firstName,
            lastName: input.lastName,
            passwordHash,
            passwordResetHash: null,
            passwordResetExpiresAt: null,
            deletedAt: null,
          },
        })
      : await prisma.user.create({
          data: {
            communityId: record.communityId,
            email,
            role: record.role,
            status: "ACTIVE",
            firstName: input.firstName,
            lastName: input.lastName,
            passwordHash,
          },
        });

    if (record.flatId) {
      const already = await prisma.flatOccupant.findFirst({
        where: { flatId: record.flatId, userId: saved.id, movedOutAt: null },
        select: { id: true },
      });
      if (!already) {
        await prisma.flatOccupant.create({
          data: {
            communityId: record.communityId,
            flatId: record.flatId,
            userId: saved.id,
            relation: "OWNER",
            isPrimary: true,
            movedInAt: new Date(),
          },
        });
        await prisma.flat.update({ where: { id: record.flatId }, data: { status: "OCCUPIED" } });
      }
    }

    await prisma.invitation.update({
      where: { id: record.id },
      data: { acceptedAt: new Date() },
    });

    return saved;
  });

  await writeAudit({
    action: "INVITATION.ACCEPT",
    resource: "User",
    resourceId: user.id,
    communityId: record.communityId,
    userId: user.id,
    meta: { email },
    ip,
  });

  return toPublicUser({ ...user, role: user.role as Role });
}
