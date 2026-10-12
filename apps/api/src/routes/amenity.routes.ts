import { Router } from "express";
import { amenityListQuerySchema, amenityUpsertSchema } from "@superlink/shared";
import * as amenityController from "../controllers/amenity.controller.js";
import { amenityAvailabilityQuerySchema } from "@superlink/shared";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const amenityRoutes: Router = Router();

amenityRoutes.use(authenticate);

amenityRoutes.get(
  "/",
  requirePermission("AMENITY_VIEW"),
  validateQuery(amenityListQuerySchema),
  amenityController.listAmenities,
);
amenityRoutes.post(
  "/",
  requirePermission("AMENITY_MANAGE"),
  validateBody(amenityUpsertSchema),
  amenityController.createAmenity,
);
amenityRoutes.get("/:id", requirePermission("AMENITY_VIEW"), amenityController.getAmenity);
amenityRoutes.patch(
  "/:id",
  requirePermission("AMENITY_MANAGE"),
  validateBody(amenityUpsertSchema.partial()),
  amenityController.updateAmenity,
);
amenityRoutes.get(
  "/:id/availability",
  requirePermission("AMENITY_VIEW"),
  validateQuery(amenityAvailabilityQuerySchema),
  amenityController.getAvailability,
);
