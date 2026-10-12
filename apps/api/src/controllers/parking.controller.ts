import type { Request, Response } from "express";
import * as parkingService from "../services/parking.service.js";
import { ok } from "../utils/respond.js";

export async function listSlots(req: Request, res: Response): Promise<void> {
  const result = await parkingService.listSlots(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function createSlot(req: Request, res: Response): Promise<void> {
  ok(res, await parkingService.createSlot(req.body as never));
}

export async function updateSlot(req: Request, res: Response): Promise<void> {
  ok(res, await parkingService.updateSlot(req.params.id as string, req.body as never));
}

export async function deleteSlot(req: Request, res: Response): Promise<void> {
  ok(res, await parkingService.deleteSlot(req.params.id as string));
}

export async function listAssignments(req: Request, res: Response): Promise<void> {
  const result = await parkingService.listAssignments(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function assignSlot(req: Request, res: Response): Promise<void> {
  ok(res, await parkingService.assignSlot(req.body as never));
}

export async function endAssignment(req: Request, res: Response): Promise<void> {
  ok(res, await parkingService.endAssignment(req.params.id as string, req.body?.endsAt as Date | undefined));
}

export async function listVisitorParking(req: Request, res: Response): Promise<void> {
  const result = await parkingService.listVisitorParking(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function createVisitorParking(req: Request, res: Response): Promise<void> {
  ok(res, await parkingService.createVisitorParking(req.body as never));
}
