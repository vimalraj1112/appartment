import type { Request, Response } from "express";
import * as emergencyService from "../services/emergency.service.js";
import { ok } from "../utils/respond.js";

export async function triggerAlert(req: Request, res: Response): Promise<void> {
  ok(res, await emergencyService.triggerAlert(req.body as never));
}

export async function listAlerts(req: Request, res: Response): Promise<void> {
  const result = await emergencyService.listAlerts(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function getAlert(req: Request, res: Response): Promise<void> {
  ok(res, await emergencyService.getAlert(req.params.id as string));
}

export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  const { note } = req.body as { note?: string };
  ok(res, await emergencyService.acknowledgeAlert(req.params.id as string, note));
}

export async function resolveAlert(req: Request, res: Response): Promise<void> {
  const { note } = req.body as { note?: string };
  ok(res, await emergencyService.resolveAlert(req.params.id as string, note));
}
