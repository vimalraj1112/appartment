import { Router } from "express";
import {
  expenseCategoryCreateSchema,
  expenseCreateSchema,
  expenseListQuerySchema,
  expenseUpdateSchema,
} from "@superlink/shared";
import * as billingController from "../controllers/billing.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const expenseRoutes: Router = Router();

expenseRoutes.use(authenticate);
expenseRoutes.use(requirePermission("FINANCE_VIEW"));

expenseRoutes.get("/categories", billingController.listExpenseCategories);
expenseRoutes.post(
  "/categories",
  validateBody(expenseCategoryCreateSchema),
  billingController.createExpenseCategory,
);

expenseRoutes.get("/", validateQuery(expenseListQuerySchema), billingController.listExpenses);
expenseRoutes.post("/", validateBody(expenseCreateSchema), billingController.createExpense);
expenseRoutes.patch(
  "/:id",
  validateBody(expenseUpdateSchema),
  billingController.updateExpense,
);
expenseRoutes.delete("/:id", billingController.deleteExpense);
