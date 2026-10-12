import { Router } from "express";
import { emergencyListQuerySchema, emergencyNoteSchema, emergencyTriggerSchema } from "@superlink/shared";
import * as emergencyController from "../controllers/emergency.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const emergencyRoutes: Router = Router();

emergencyRoutes.use(authenticate);

emergencyRoutes.post(
  "/",
  requirePermission("EMERGENCY_TRIGGER"),
  validateBody(emergencyTriggerSchema),
  emergencyController.triggerAlert,
);
emergencyRoutes.get(
  "/",
  requirePermission("EMERGENCY_VIEW"),
  validateQuery(emergencyListQuerySchema),
  emergencyController.listAlerts,
);
emergencyRoutes.get("/:id", requirePermission("EMERGENCY_VIEW"), emergencyController.getAlert);
emergencyRoutes.post(
  "/:id/acknowledge",
  requirePermission("EMERGENCY_MANAGE"),
  validateBody(emergencyNoteSchema),
  emergencyController.acknowledgeAlert,
);
emergencyRoutes.post(
  "/:id/resolve",
  requirePermission("EMERGENCY_MANAGE"),
  validateBody(emergencyNoteSchema),
  emergencyController.resolveAlert,
);
