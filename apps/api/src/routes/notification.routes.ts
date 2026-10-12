import { Router } from "express";
import { notificationCreateSchema, notificationListQuerySchema } from "@superlink/shared";
import * as notificationController from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const notificationRoutes: Router = Router();

notificationRoutes.use(authenticate);

notificationRoutes.get(
  "/",
  requirePermission("NOTIFICATION_VIEW"),
  validateQuery(notificationListQuerySchema),
  notificationController.list,
);
notificationRoutes.get(
  "/unread-count",
  requirePermission("NOTIFICATION_VIEW"),
  notificationController.unreadCount,
);
notificationRoutes.post(
  "/read-all",
  requirePermission("NOTIFICATION_VIEW"),
  notificationController.markAllRead,
);
notificationRoutes.post(
  "/send",
  requirePermission("NOTIFICATION_SEND"),
  validateBody(notificationCreateSchema),
  notificationController.send,
);
notificationRoutes.post(
  "/:id/read",
  requirePermission("NOTIFICATION_VIEW"),
  notificationController.markRead,
);
