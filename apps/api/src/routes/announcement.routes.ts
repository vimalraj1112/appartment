import { Router } from "express";
import { announcementCreateSchema, announcementListQuerySchema, announcementUpdateSchema } from "@superlink/shared";
import * as announcementController from "../controllers/announcement.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const announcementRoutes: Router = Router();

announcementRoutes.use(authenticate);

announcementRoutes.get(
  "/",
  requirePermission("ANNOUNCEMENT_READ"),
  validateQuery(announcementListQuerySchema),
  announcementController.listAnnouncements,
);
announcementRoutes.post(
  "/",
  requirePermission("ANNOUNCEMENT_MANAGE"),
  validateBody(announcementCreateSchema),
  announcementController.createAnnouncement,
);
announcementRoutes.get("/:id", requirePermission("ANNOUNCEMENT_READ"), announcementController.getAnnouncement);
announcementRoutes.patch(
  "/:id",
  requirePermission("ANNOUNCEMENT_MANAGE"),
  validateBody(announcementUpdateSchema),
  announcementController.updateAnnouncement,
);
announcementRoutes.delete(
  "/:id",
  requirePermission("ANNOUNCEMENT_MANAGE"),
  announcementController.deleteAnnouncement,
);
announcementRoutes.post(
  "/:id/ack",
  requirePermission("ANNOUNCEMENT_READ"),
  announcementController.acknowledgeAnnouncement,
);
