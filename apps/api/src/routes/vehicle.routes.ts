import { Router } from "express";
import { vehicleCreateSchema, vehicleListQuerySchema, vehicleUpdateSchema } from "@superlink/shared";
import * as vehicleController from "../controllers/vehicle.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission, requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const vehicleRoutes: Router = Router();

vehicleRoutes.use(authenticate);

vehicleRoutes.get(
  "/",
  requireAnyPermission("VEHICLE_OWN", "VEHICLE_SEARCH"),
  validateQuery(vehicleListQuerySchema),
  vehicleController.listVehicles,
);
vehicleRoutes.post(
  "/",
  requirePermission("VEHICLE_OWN"),
  validateBody(vehicleCreateSchema),
  vehicleController.createVehicle,
);
vehicleRoutes.get(
  "/:id",
  requireAnyPermission("VEHICLE_OWN", "VEHICLE_SEARCH"),
  vehicleController.getVehicle,
);
vehicleRoutes.patch(
  "/:id",
  requirePermission("VEHICLE_OWN"),
  validateBody(vehicleUpdateSchema),
  vehicleController.updateVehicle,
);
vehicleRoutes.delete("/:id", requirePermission("VEHICLE_OWN"), vehicleController.deleteVehicle);
