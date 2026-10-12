import { Router } from "express";
import {
  platformAssignSubscriptionSchema,
  platformAuditQuerySchema,
  platformCommunityListQuerySchema,
  platformCommunityStatusSchema,
  platformCreateCommunitySchema,
  platformPlanSchema,
  platformPlanUpdateSchema,
  platformSubscriptionListQuerySchema,
  leadListQuerySchema,
  leadUpdateSchema,
} from "@superlink/shared";
import * as platformController from "../controllers/platform.controller.js";
import * as leadController from "../controllers/lead.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

/**
 * Super-admin platform console. Every route is SUPER_ADMIN-only; cross-tenant
 * reads/writes are safe because the platform role carries no communityId and the
 * tenant extension bypasses scoping for it. Mutations are written to the audit
 * log with a PLATFORM.* action.
 */
export const platformRoutes: Router = Router();

platformRoutes.use(authenticate);

platformRoutes.get("/overview", requirePermission("PLATFORM_ANALYTICS"), platformController.overview);

platformRoutes.get(
  "/communities",
  requirePermission("PLATFORM_COMMUNITY_MANAGE"),
  validateQuery(platformCommunityListQuerySchema),
  platformController.listCommunities,
);
platformRoutes.post(
  "/communities",
  requirePermission("PLATFORM_COMMUNITY_MANAGE"),
  validateBody(platformCreateCommunitySchema),
  platformController.createCommunity,
);
platformRoutes.get(
  "/communities/:id",
  requirePermission("PLATFORM_COMMUNITY_MANAGE"),
  platformController.getCommunity,
);
platformRoutes.patch(
  "/communities/:id/status",
  requirePermission("PLATFORM_COMMUNITY_MANAGE"),
  validateBody(platformCommunityStatusSchema),
  platformController.setCommunityStatus,
);
platformRoutes.put(
  "/communities/:id/subscription",
  requirePermission("PLATFORM_SUBSCRIPTION_MANAGE"),
  validateBody(platformAssignSubscriptionSchema),
  platformController.assignSubscription,
);

platformRoutes.get("/plans", requirePermission("PLATFORM_PLAN_MANAGE"), platformController.listPlans);
platformRoutes.post(
  "/plans",
  requirePermission("PLATFORM_PLAN_MANAGE"),
  validateBody(platformPlanSchema),
  platformController.createPlan,
);
platformRoutes.patch(
  "/plans/:id",
  requirePermission("PLATFORM_PLAN_MANAGE"),
  validateBody(platformPlanUpdateSchema),
  platformController.updatePlan,
);

platformRoutes.get(
  "/subscriptions",
  requirePermission("PLATFORM_SUBSCRIPTION_MANAGE"),
  validateQuery(platformSubscriptionListQuerySchema),
  platformController.listSubscriptions,
);

platformRoutes.get(
  "/audit",
  requirePermission("PLATFORM_AUDIT_VIEW"),
  validateQuery(platformAuditQuerySchema),
  platformController.listAudit,
);

platformRoutes.get(
  "/leads",
  requirePermission("PLATFORM_LEAD_MANAGE"),
  validateQuery(leadListQuerySchema),
  leadController.list,
);
platformRoutes.patch(
  "/leads/:id",
  requirePermission("PLATFORM_LEAD_MANAGE"),
  validateBody(leadUpdateSchema),
  leadController.updateStatus,
);
