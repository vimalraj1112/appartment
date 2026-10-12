import { Router } from "express";
import {
  billGenerateSchema,
  billListQuerySchema,
  maintenanceConfigUpsertSchema,
  paymentCreateSchema,
} from "@superlink/shared";
import * as billingController from "../controllers/billing.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission, requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const billingRoutes: Router = Router();

billingRoutes.use(authenticate);

// Maintenance config
billingRoutes.get("/config", requirePermission("BILLING_CONFIGURE"), billingController.listConfigs);
billingRoutes.put(
  "/config",
  requirePermission("BILLING_CONFIGURE"),
  validateBody(maintenanceConfigUpsertSchema),
  billingController.upsertConfig,
);

billingRoutes.get("/summary", requirePermission("FINANCE_VIEW"), billingController.financeSummary);

// Bills
billingRoutes.get(
  "/bills",
  requireAnyPermission("BILL_VIEW_OWN", "FINANCE_VIEW"),
  validateQuery(billListQuerySchema),
  billingController.listBills,
);
billingRoutes.post(
  "/bills/generate",
  requirePermission("BILLING_CONFIGURE"),
  validateBody(billGenerateSchema),
  billingController.generateBills,
);
billingRoutes.post(
  "/bills/overdue",
  requirePermission("BILLING_CONFIGURE"),
  billingController.markOverdue,
);
billingRoutes.get(
  "/bills/:id",
  requireAnyPermission("BILL_VIEW_OWN", "FINANCE_VIEW"),
  billingController.getBill,
);

// Resident payment against a bill
billingRoutes.post(
  "/bills/:id/pay",
  requirePermission("BILL_PAY"),
  validateBody(paymentCreateSchema),
  billingController.payBill,
);
