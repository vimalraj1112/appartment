import type { Request, Response } from "express";
import * as staffService from "../services/staff.service.js";
import { ok } from "../utils/respond.js";

export async function listStaffUsers(_req: Request, res: Response): Promise<void> {
  ok(res, await staffService.listStaffUsers());
}

export async function listProfiles(req: Request, res: Response): Promise<void> {
  const result = await staffService.listStaffProfiles(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function createProfile(req: Request, res: Response): Promise<void> {
  ok(res, await staffService.createStaffProfile(req.body as never));
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  ok(res, await staffService.updateStaffProfile(req.params.id as string, req.body as never));
}

export async function listEntries(req: Request, res: Response): Promise<void> {
  const result = await staffService.listStaffEntries(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function createEntry(req: Request, res: Response): Promise<void> {
  ok(res, await staffService.createStaffEntry(req.body as never));
}

export async function listDomestic(req: Request, res: Response): Promise<void> {
  const result = await staffService.listDomesticStaff(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function createDomestic(req: Request, res: Response): Promise<void> {
  ok(res, await staffService.createDomesticStaff(req.body as never));
}

export async function updateDomestic(req: Request, res: Response): Promise<void> {
  ok(res, await staffService.updateDomesticStaff(req.params.id as string, req.body as never));
}
