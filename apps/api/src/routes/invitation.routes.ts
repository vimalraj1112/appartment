import { Router } from "express";
import { acceptInvitationSchema, invitationCreateSchema } from "@superlink/shared";
import * as invitationController from "../controllers/invitation.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";

/** Public routes — mounted before authentication middleware. */
export const publicInvitationRoutes: Router = Router();

publicInvitationRoutes.get("/public/:token", invitationController.getPublicInvitation);
publicInvitationRoutes.post(
  "/accept",
  authLimiter,
  validateBody(acceptInvitationSchema),
  invitationController.acceptInvitation,
);

/** Admin routes. */
export const invitationRoutes: Router = Router();

invitationRoutes.use(authenticate);
invitationRoutes.use(requirePermission("RESIDENT_MANAGE"));

invitationRoutes.get("/", invitationController.listInvitations);
invitationRoutes.post("/", validateBody(invitationCreateSchema), invitationController.createInvitation);
invitationRoutes.delete("/:id", invitationController.revokeInvitation);
