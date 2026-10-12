import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";

export const dashboardRoutes: Router = Router();

dashboardRoutes.use(authenticate);
dashboardRoutes.get("/", requirePermission("DASHBOARD_VIEW"), dashboardController.get);
