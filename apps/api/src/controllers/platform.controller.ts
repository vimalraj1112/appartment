import type { Request, Response } from "express";
import type {
  PlatformAssignSubscriptionInput,
  PlatformAuditQuery,
  PlatformCommunityListQuery,
  PlatformCommunityStatusInput,
  PlatformCreateCommunityInput,
  PlatformPlanInput,
  PlatformPlanUpdateInput,
  PlatformSubscriptionListQuery,
} from "@superlink/shared";
import { ok } from "../utils/respond.js";
import * as platform from "../services/platform.service.js";

export async function overview(_req: Request, res: Response): Promise<void> {
  ok(res, await platform.getPlatformOverview());
}

export async function listCommunities(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as PlatformCommunityListQuery;
  const { items, meta } = await platform.listCommunities(query);
  ok(res, items, meta);
}

export async function createCommunity(req: Request, res: Response): Promise<void> {
  ok(res, await platform.createCommunity(req.body as PlatformCreateCommunityInput));
}

export async function getCommunity(req: Request, res: Response): Promise<void> {
  ok(res, await platform.getCommunity(req.params.id as string));
}

export async function setCommunityStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body as PlatformCommunityStatusInput;
  ok(res, await platform.setCommunityStatus(req.params.id as string, status));
}

export async function listPlans(_req: Request, res: Response): Promise<void> {
  ok(res, await platform.listPlans());
}

export async function createPlan(req: Request, res: Response): Promise<void> {
  ok(res, await platform.createPlan(req.body as PlatformPlanInput));
}

export async function updatePlan(req: Request, res: Response): Promise<void> {
  ok(res, await platform.updatePlan(req.params.id as string, req.body as PlatformPlanUpdateInput));
}

export async function listSubscriptions(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as PlatformSubscriptionListQuery;
  const { items, meta } = await platform.listSubscriptions(query);
  ok(res, items, meta);
}

export async function assignSubscription(req: Request, res: Response): Promise<void> {
  const input = req.body as PlatformAssignSubscriptionInput;
  ok(res, await platform.assignSubscription(req.params.id as string, input));
}

export async function listAudit(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as PlatformAuditQuery;
  const { items, meta } = await platform.listAuditLogs(query);
  ok(res, items, meta);
}
