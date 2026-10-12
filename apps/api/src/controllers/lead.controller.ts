import type { Request, Response } from "express";
import type { LeadCreateInput, LeadListQuery, LeadUpdateInput } from "@superlink/shared";
import { ok } from "../utils/respond.js";
import * as leads from "../services/lead.service.js";

export async function submit(req: Request, res: Response): Promise<void> {
  ok(res, await leads.createLead(req.body as LeadCreateInput, req.ip));
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as LeadListQuery;
  const { items, meta } = await leads.listLeads(query);
  ok(res, items, meta);
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body as LeadUpdateInput;
  ok(res, await leads.updateLeadStatus(req.params.id as string, status));
}
