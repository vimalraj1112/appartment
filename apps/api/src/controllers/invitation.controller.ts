import type { Request, Response } from "express";
import type { AcceptInvitationInput, InvitationCreateInput } from "@superlink/shared";
import { authContextOrThrow } from "../middleware/rbac.js";
import * as invitations from "../services/invitation.service.js";
import { ok } from "../utils/respond.js";

export async function listInvitations(_req: Request, res: Response): Promise<void> {
  ok(res, await invitations.listInvitations());
}

export async function createInvitation(req: Request, res: Response): Promise<void> {
  const auth = authContextOrThrow();
  const result = await invitations.createInvitation(auth.userId, {
    ...(req.body as InvitationCreateInput),
    ip: req.ip,
  });
  ok(res, result);
}

export async function revokeInvitation(req: Request, res: Response): Promise<void> {
  await invitations.revokeInvitation(req.params.id as string);
  ok(res, { deleted: true });
}

export async function getPublicInvitation(req: Request, res: Response): Promise<void> {
  ok(res, await invitations.getPublicInvitation(req.params.token as string));
}

export async function acceptInvitation(req: Request, res: Response): Promise<void> {
  const user = await invitations.acceptInvitation(req.body as AcceptInvitationInput, req.ip);
  ok(res, { user });
}
