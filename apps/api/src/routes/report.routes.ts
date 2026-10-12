import { Router } from "express";
import { handoverQuerySchema, reportTrendQuerySchema } from "@superlink/shared";
import * as reportController from "../controllers/report.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateQuery } from "../middleware/validate.js";

/**
 * Community analytics + health scorecard.
 * Community-admin only — SECURITY is intentionally excluded from every route
 * under `/reports` (asserted by the generated RBAC matrix).
 */
export const reportRoutes: Router = Router();
reportRoutes.use(authenticate);
reportRoutes.get("/overview", requirePermission("REPORTS_VIEW"), reportController.overview);
reportRoutes.get(
  "/trends",
  requirePermission("REPORTS_VIEW"),
  validateQuery(reportTrendQuerySchema),
  reportController.trends,
);
reportRoutes.get("/breakdown", requirePermission("REPORTS_VIEW"), reportController.breakdown);
reportRoutes.get("/scorecard", requirePermission("REPORTS_VIEW"), reportController.scorecard);

/**
 * Guard shift handover report. Lives outside `/reports` so SECURITY (a gate
 * operator) can read it via `GATE_OPERATIONS` without touching finance routes.
 */
export const handoverRoutes: Router = Router();
handoverRoutes.use(authenticate);
handoverRoutes.get(
  "/",
  requirePermission("GATE_OPERATIONS"),
  validateQuery(handoverQuerySchema),
  reportController.handover,
);
