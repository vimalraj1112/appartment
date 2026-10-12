import type { Request, Response } from "express";
import * as reportService from "../services/report.service.js";
import { ok } from "../utils/respond.js";

export async function overview(_req: Request, res: Response): Promise<void> {
  ok(res, await reportService.getOverview());
}

export async function trends(req: Request, res: Response): Promise<void> {
  const { months } = req.validatedQuery as { months: number };
  ok(res, await reportService.getCollectionsTrend(months));
}

export async function breakdown(_req: Request, res: Response): Promise<void> {
  ok(res, await reportService.getBreakdown());
}

export async function scorecard(_req: Request, res: Response): Promise<void> {
  ok(res, await reportService.getScorecard());
}

export async function handover(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as { from?: Date; to?: Date };
  ok(res, await reportService.getHandoverReport(query));
}
