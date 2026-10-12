import { Router } from "express";
import {
  deliveryCreateSchema,
  deliveryListQuerySchema,
  deliveryStatusUpdateSchema,
  visitorEntryCreateSchema,
  visitorEntryListQuerySchema,
  visitorPassCreateSchema,
  visitorPassDecisionSchema,
  visitorPassListQuerySchema,
  visitorVerifySchema,
  visitorWalkInSchema,
  watchlistCreateSchema,
  watchlistListQuerySchema,
} from "@superlink/shared";
import * as visitorController from "../controllers/visitor.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

/** Public — mounted before authentication. */
export const publicVisitorRoutes: Router = Router();

publicVisitorRoutes.get("/public/passes/:token", visitorController.getPublicPass);

export const visitorRoutes: Router = Router();

visitorRoutes.use(authenticate);

// Passes
visitorRoutes.get(
  "/passes",
  requirePermission("VISITOR_VIEW"),
  validateQuery(visitorPassListQuerySchema),
  visitorController.listPasses,
);
visitorRoutes.post(
  "/passes",
  requirePermission("VISITOR_PASS_CREATE"),
  validateBody(visitorPassCreateSchema),
  visitorController.createPass,
);
visitorRoutes.get("/passes/:id", requirePermission("VISITOR_VIEW"), visitorController.getPass);
visitorRoutes.delete(
  "/passes/:id",
  requirePermission("VISITOR_PASS_CREATE"),
  visitorController.cancelPass,
);
visitorRoutes.post(
  "/passes/:id/decision",
  requirePermission("VISITOR_APPROVE"),
  validateBody(visitorPassDecisionSchema),
  visitorController.decidePass,
);

// Gate operations
visitorRoutes.get(
  "/flats",
  requirePermission("GATE_OPERATIONS"),
  visitorController.listGateFlats,
);
visitorRoutes.post(
  "/verify",
  requirePermission("GATE_OPERATIONS"),
  validateBody(visitorVerifySchema),
  visitorController.verifyPass,
);
visitorRoutes.get(
  "/entries",
  requirePermission("VISITOR_VIEW"),
  validateQuery(visitorEntryListQuerySchema),
  visitorController.listEntries,
);
visitorRoutes.post(
  "/entries",
  requirePermission("GATE_OPERATIONS"),
  validateBody(visitorEntryCreateSchema),
  visitorController.registerEntry,
);
visitorRoutes.post(
  "/walk-in",
  requirePermission("GATE_OPERATIONS"),
  validateBody(visitorWalkInSchema),
  visitorController.walkIn,
);

// Deliveries
visitorRoutes.get(
  "/deliveries",
  requirePermission("VISITOR_VIEW"),
  validateQuery(deliveryListQuerySchema),
  visitorController.listDeliveries,
);
visitorRoutes.post(
  "/deliveries",
  requirePermission("DELIVERY_MANAGE"),
  validateBody(deliveryCreateSchema),
  visitorController.createDelivery,
);
visitorRoutes.patch(
  "/deliveries/:id/status",
  requirePermission("DELIVERY_MANAGE"),
  validateBody(deliveryStatusUpdateSchema),
  visitorController.updateDeliveryStatus,
);

// Watchlist
visitorRoutes.get(
  "/watchlist",
  requirePermission("WATCHLIST_MANAGE"),
  validateQuery(watchlistListQuerySchema),
  visitorController.listWatchlist,
);
visitorRoutes.post(
  "/watchlist",
  requirePermission("WATCHLIST_MANAGE"),
  validateBody(watchlistCreateSchema),
  visitorController.createWatchlist,
);
visitorRoutes.delete(
  "/watchlist/:id",
  requirePermission("WATCHLIST_MANAGE"),
  visitorController.deactivateWatchlist,
);
