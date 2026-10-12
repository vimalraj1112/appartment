import { Router } from "express";
import {
  domesticStaffCreateSchema,
  domesticStaffListQuerySchema,
  domesticStaffUpdateSchema,
  staffEntryCreateSchema,
  staffEntryListQuerySchema,
  staffProfileCreateSchema,
  staffProfileListQuerySchema,
  staffProfileUpdateSchema,
} from "@superlink/shared";
import * as staffController from "../controllers/staff.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const staffRoutes: Router = Router();

staffRoutes.use(authenticate);

staffRoutes.get("/users", requirePermission("STAFF_MANAGE"), staffController.listStaffUsers);

// Community staff profiles
staffRoutes.get(
  "/profiles",
  requirePermission("STAFF_MANAGE"),
  validateQuery(staffProfileListQuerySchema),
  staffController.listProfiles,
);
staffRoutes.post(
  "/profiles",
  requirePermission("STAFF_MANAGE"),
  validateBody(staffProfileCreateSchema),
  staffController.createProfile,
);
staffRoutes.patch(
  "/profiles/:id",
  requirePermission("STAFF_MANAGE"),
  validateBody(staffProfileUpdateSchema),
  staffController.updateProfile,
);

// Staff gate entries
staffRoutes.get(
  "/entries",
  requirePermission("STAFF_ENTRY"),
  validateQuery(staffEntryListQuerySchema),
  staffController.listEntries,
);
staffRoutes.post(
  "/entries",
  requirePermission("STAFF_ENTRY"),
  validateBody(staffEntryCreateSchema),
  staffController.createEntry,
);

// Domestic staff (registered per flat)
staffRoutes.get(
  "/domestic",
  requirePermission("DOMESTIC_STAFF_MANAGE"),
  validateQuery(domesticStaffListQuerySchema),
  staffController.listDomestic,
);
staffRoutes.post(
  "/domestic",
  requirePermission("DOMESTIC_STAFF_MANAGE"),
  validateBody(domesticStaffCreateSchema),
  staffController.createDomestic,
);
staffRoutes.patch(
  "/domestic/:id",
  requirePermission("DOMESTIC_STAFF_MANAGE"),
  validateBody(domesticStaffUpdateSchema),
  staffController.updateDomestic,
);
