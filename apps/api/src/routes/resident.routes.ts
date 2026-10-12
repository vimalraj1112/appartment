import { Router } from "express";
import {
  assignFlatSchema,
  residentCreateSchema,
  residentListQuerySchema,
  residentUpdateSchema,
} from "@superlink/shared";
import * as residentController from "../controllers/resident.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const residentRoutes: Router = Router();

residentRoutes.use(authenticate);
residentRoutes.use(requirePermission("RESIDENT_MANAGE"));

residentRoutes.get("/", validateQuery(residentListQuerySchema), residentController.listResidents);
residentRoutes.post("/", validateBody(residentCreateSchema), residentController.createResident);
residentRoutes.get("/:id", residentController.getResident);
residentRoutes.patch("/:id", validateBody(residentUpdateSchema), residentController.updateResident);
residentRoutes.post("/:id/flats", validateBody(assignFlatSchema), residentController.assignFlat);
residentRoutes.delete("/:id/flats/:occupantId", residentController.unassignFlat);
