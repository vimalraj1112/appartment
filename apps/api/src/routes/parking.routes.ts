import { Router } from "express";
import {
  parkingAssignmentCreateSchema,
  parkingAssignmentEndSchema,
  parkingAssignmentListQuerySchema,
  parkingSlotCreateSchema,
  parkingSlotListQuerySchema,
  parkingSlotUpdateSchema,
  parkingVisitorCreateSchema,
  parkingVisitorListQuerySchema,
} from "@superlink/shared";
import * as parkingController from "../controllers/parking.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission, requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const parkingRoutes: Router = Router();

parkingRoutes.use(authenticate);

// Slots
parkingRoutes.get(
  "/slots",
  requirePermission("PARKING_VIEW"),
  validateQuery(parkingSlotListQuerySchema),
  parkingController.listSlots,
);
parkingRoutes.post(
  "/slots",
  requirePermission("PARKING_MANAGE"),
  validateBody(parkingSlotCreateSchema),
  parkingController.createSlot,
);
parkingRoutes.patch(
  "/slots/:id",
  requirePermission("PARKING_MANAGE"),
  validateBody(parkingSlotUpdateSchema),
  parkingController.updateSlot,
);
parkingRoutes.delete(
  "/slots/:id",
  requirePermission("PARKING_MANAGE"),
  parkingController.deleteSlot,
);

// Assignments
parkingRoutes.get(
  "/assignments",
  requireAnyPermission("PARKING_MANAGE", "GATE_OPERATIONS"),
  validateQuery(parkingAssignmentListQuerySchema),
  parkingController.listAssignments,
);
parkingRoutes.post(
  "/assignments",
  requirePermission("PARKING_MANAGE"),
  validateBody(parkingAssignmentCreateSchema),
  parkingController.assignSlot,
);
parkingRoutes.post(
  "/assignments/:id/end",
  requirePermission("PARKING_MANAGE"),
  validateBody(parkingAssignmentEndSchema),
  parkingController.endAssignment,
);

// Visitor parking
parkingRoutes.get(
  "/visitors",
  requireAnyPermission("PARKING_MANAGE", "PARKING_VISITOR_MANAGE"),
  validateQuery(parkingVisitorListQuerySchema),
  parkingController.listVisitorParking,
);
parkingRoutes.post(
  "/visitors",
  requirePermission("PARKING_VISITOR_MANAGE"),
  validateBody(parkingVisitorCreateSchema),
  parkingController.createVisitorParking,
);
