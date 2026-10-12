import { Router } from "express";
import { manualPaymentCreateSchema, paymentListQuerySchema } from "@superlink/shared";
import * as billingController from "../controllers/billing.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission, requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const paymentRoutes: Router = Router();

paymentRoutes.use(authenticate);

paymentRoutes.get(
  "/",
  requireAnyPermission("BILL_VIEW_OWN", "FINANCE_VIEW"),
  validateQuery(paymentListQuerySchema),
  billingController.listPayments,
);

paymentRoutes.post(
  "/manual",
  requirePermission("FINANCE_VIEW"),
  validateBody(manualPaymentCreateSchema),
  billingController.recordManualPayment,
);

paymentRoutes.get(
  "/:id",
  requireAnyPermission("BILL_VIEW_OWN", "FINANCE_VIEW"),
  billingController.getPayment,
);
