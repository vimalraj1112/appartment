import type { Request, Response } from "express";
import * as complaintService from "../services/complaint.service.js";
import { ok } from "../utils/respond.js";

export async function listCategories(req: Request, res: Response): Promise<void> {
  const includeInactive = req.query.includeInactive === "true";
  ok(res, await complaintService.listCategories(includeInactive));
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    name: string;
    description?: string;
    slaHours?: number;
    sortOrder?: number;
    isActive?: boolean;
  };
  ok(res, await complaintService.createCategory(body));
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  ok(
    res,
    await complaintService.updateCategory(req.params.id as string, req.body as {
      name?: string;
      description?: string;
      slaHours?: number;
      sortOrder?: number;
      isActive?: boolean;
    }),
  );
}

export async function listComplaints(req: Request, res: Response): Promise<void> {
  const result = await complaintService.listComplaints(req.validatedQuery as never);
  ok(res, result.items, result.meta);
}

export async function getComplaint(req: Request, res: Response): Promise<void> {
  ok(res, await complaintService.getComplaint(req.params.id as string));
}

export async function createComplaint(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    title: string;
    description: string;
    categoryId?: string;
    flatId?: string;
    priority?: string;
    location?: string;
  };
  ok(res, await complaintService.createComplaint(body));
}

export async function updateComplaint(req: Request, res: Response): Promise<void> {
  ok(res, await complaintService.updateComplaint(req.params.id as string, req.body));
}

export async function assignComplaint(req: Request, res: Response): Promise<void> {
  const body = req.body as { staffUserId: string; note?: string };
  ok(res, await complaintService.assignComplaint(req.params.id as string, body));
}

export async function addComment(req: Request, res: Response): Promise<void> {
  const body = req.body as { body: string; isInternal?: boolean };
  ok(res, await complaintService.addComment(req.params.id as string, body));
}

export async function rateComplaint(req: Request, res: Response): Promise<void> {
  const body = req.body as { rating: number };
  ok(res, await complaintService.rateComplaint(req.params.id as string, body));
}
