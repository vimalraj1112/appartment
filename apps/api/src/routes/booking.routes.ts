import { Router } from "express";
import { bookingCreateSchema, bookingListQuerySchema } from "@superlink/shared";
import * as amenityController from "../controllers/amenity.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission, requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const bookingRoutes: Router = Router();

bookingRoutes.use(authenticate);

bookingRoutes.get(
  "/",
  requirePermission("BOOKING_VIEW"),
  validateQuery(bookingListQuerySchema),
  amenityController.listBookings,
);
bookingRoutes.post(
  "/",
  requirePermission("BOOKING_CREATE"),
  validateBody(bookingCreateSchema),
  amenityController.createBooking,
);
bookingRoutes.delete(
  "/:id",
  requireAnyPermission("BOOKING_MANAGE", "BOOKING_CREATE"),
  amenityController.cancelBooking,
);
