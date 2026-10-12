import type { Request, Response } from "express";
import * as vehicleService from "../services/vehicle.service.js";
import { ok } from "../utils/respond.js";

export async function listVehicles(req: Request, res: Response): Promise<void> {
  const result = await vehicleService.listVehicles(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function getVehicle(req: Request, res: Response): Promise<void> {
  ok(res, await vehicleService.getVehicle(req.params.id as string));
}

export async function createVehicle(req: Request, res: Response): Promise<void> {
  ok(res, await vehicleService.createVehicle(req.body as never));
}

export async function updateVehicle(req: Request, res: Response): Promise<void> {
  ok(res, await vehicleService.updateVehicle(req.params.id as string, req.body as never));
}

export async function deleteVehicle(req: Request, res: Response): Promise<void> {
  ok(res, await vehicleService.deleteVehicle(req.params.id as string));
}
