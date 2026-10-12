import type { Request, Response } from "express";
import * as announcementService from "../services/announcement.service.js";
import { ok } from "../utils/respond.js";

export async function listAnnouncements(req: Request, res: Response): Promise<void> {
  const result = await announcementService.listAnnouncements(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function getAnnouncement(req: Request, res: Response): Promise<void> {
  ok(res, await announcementService.getAnnouncement(req.params.id as string));
}

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  ok(res, await announcementService.createAnnouncement(req.body as never));
}

export async function updateAnnouncement(req: Request, res: Response): Promise<void> {
  ok(res, await announcementService.updateAnnouncement(req.params.id as string, req.body as never));
}

export async function deleteAnnouncement(req: Request, res: Response): Promise<void> {
  ok(res, await announcementService.deleteAnnouncement(req.params.id as string));
}

export async function acknowledgeAnnouncement(req: Request, res: Response): Promise<void> {
  ok(res, await announcementService.acknowledgeAnnouncement(req.params.id as string));
}
