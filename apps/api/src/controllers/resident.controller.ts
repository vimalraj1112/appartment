import type { Request, Response } from "express";
import type { AssignFlatInput, ResidentCreateInput, ResidentListQuery, ResidentUpdateInput } from "@superlink/shared";
import * as residents from "../services/resident.service.js";
import { ok } from "../utils/respond.js";

export async function listResidents(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ResidentListQuery;
  const { items, meta } = await residents.listResidents(query);
  ok(res, items, meta);
}

export async function getResident(req: Request, res: Response): Promise<void> {
  ok(res, await residents.getResident(req.params.id as string));
}

export async function createResident(req: Request, res: Response): Promise<void> {
  ok(res, await residents.createResident(req.body as ResidentCreateInput));
}

export async function updateResident(req: Request, res: Response): Promise<void> {
  ok(res, await residents.updateResident(req.params.id as string, req.body as ResidentUpdateInput));
}

export async function assignFlat(req: Request, res: Response): Promise<void> {
  ok(res, await residents.assignFlat(req.params.id as string, req.body as AssignFlatInput));
}

export async function unassignFlat(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await residents.unassignFlat(req.params.id as string, req.params.occupantId as string),
  );
}
