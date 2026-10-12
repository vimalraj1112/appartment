import { Router } from "express";
import {
  buildingCreateSchema,
  buildingUpdateSchema,
  familyMemberCreateSchema,
  flatBulkCreateSchema,
  flatCreateSchema,
  flatListQuerySchema,
  flatUpdateSchema,
  floorCreateSchema,
  floorUpdateSchema,
} from "@superlink/shared";
import * as structureController from "../controllers/structure.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const structureRoutes: Router = Router();

structureRoutes.use(authenticate);
structureRoutes.use(requirePermission("STRUCTURE_MANAGE"));

// Buildings
structureRoutes.get("/buildings", structureController.listBuildings);
structureRoutes.post("/buildings", validateBody(buildingCreateSchema), structureController.createBuilding);
structureRoutes.get("/buildings/:id", structureController.getBuilding);
structureRoutes.patch("/buildings/:id", validateBody(buildingUpdateSchema), structureController.updateBuilding);
structureRoutes.delete("/buildings/:id", structureController.deleteBuilding);

// Floors
structureRoutes.get("/buildings/:buildingId/floors", structureController.listFloors);
structureRoutes.post(
  "/buildings/:buildingId/floors",
  validateBody(floorCreateSchema),
  structureController.createFloor,
);
structureRoutes.patch("/floors/:id", validateBody(floorUpdateSchema), structureController.updateFloor);
structureRoutes.delete("/floors/:id", structureController.deleteFloor);

// Flats
structureRoutes.get("/flats", validateQuery(flatListQuerySchema), structureController.listFlats);
structureRoutes.post("/flats", validateBody(flatCreateSchema), structureController.createFlat);
structureRoutes.post("/flats/bulk", validateBody(flatBulkCreateSchema), structureController.bulkCreateFlats);
structureRoutes.get("/flats/:id", structureController.getFlat);
structureRoutes.patch("/flats/:id", validateBody(flatUpdateSchema), structureController.updateFlat);
structureRoutes.delete("/flats/:id", structureController.deleteFlat);

// Family members
structureRoutes.post(
  "/flats/:id/family",
  validateBody(familyMemberCreateSchema),
  structureController.addFamilyMember,
);
structureRoutes.delete("/family/:id", structureController.removeFamilyMember);
