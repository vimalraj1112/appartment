import type { Request, Response } from "express";
import { authContextOrThrow } from "../middleware/rbac.js";
import * as dashboard from "../services/dashboard.service.js";
import { ok } from "../utils/respond.js";

export async function get(_req: Request, res: Response): Promise<void> {
  const auth = authContextOrThrow();
  ok(res, await dashboard.getMyDashboard(auth.userId));
}
