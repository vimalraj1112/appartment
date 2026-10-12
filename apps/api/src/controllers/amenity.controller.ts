import type { Request, Response } from "express";
import * as amenityService from "../services/amenity.service.js";
import { ok } from "../utils/respond.js";

export async function listAmenities(req: Request, res: Response): Promise<void> {
  const result = await amenityService.listAmenities(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function getAmenity(req: Request, res: Response): Promise<void> {
  ok(res, await amenityService.getAmenity(req.params.id as string));
}

export async function createAmenity(req: Request, res: Response): Promise<void> {
  ok(res, await amenityService.createAmenity(req.body as never));
}

export async function updateAmenity(req: Request, res: Response): Promise<void> {
  ok(res, await amenityService.updateAmenity(req.params.id as string, req.body as never));
}

export async function getAvailability(req: Request, res: Response): Promise<void> {
  const { date } = req.validatedQuery as { date: string };
  ok(res, await amenityService.getAmenityAvailability(req.params.id as string, date));
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  ok(res, await amenityService.createBooking(req.body as never));
}

export async function listBookings(req: Request, res: Response): Promise<void> {
  const result = await amenityService.listBookings(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function cancelBooking(req: Request, res: Response): Promise<void> {
  const body = req.body as { reason?: string };
  ok(res, await amenityService.cancelBooking(req.params.id as string, body?.reason));
}
