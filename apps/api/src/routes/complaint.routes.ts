import { Router } from "express";
import {
  complaintAssignSchema,
  complaintCategoryCreateSchema,
  complaintCategoryUpdateSchema,
  complaintCommentCreateSchema,
  complaintCreateSchema,
  complaintListQuerySchema,
  complaintRatingSchema,
  complaintUpdateSchema,
} from "@superlink/shared";
import * as complaintController from "../controllers/complaint.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const complaintRoutes: Router = Router();

complaintRoutes.use(authenticate);

// Categories
complaintRoutes.get(
  "/categories",
  requirePermission("COMPLAINT_VIEW"),
  complaintController.listCategories,
);
complaintRoutes.post(
  "/categories",
  requirePermission("COMPLAINT_CATEGORY_MANAGE"),
  validateBody(complaintCategoryCreateSchema),
  complaintController.createCategory,
);
complaintRoutes.patch(
  "/categories/:id",
  requirePermission("COMPLAINT_CATEGORY_MANAGE"),
  validateBody(complaintCategoryUpdateSchema),
  complaintController.updateCategory,
);

// Complaints
complaintRoutes.get(
  "/",
  requirePermission("COMPLAINT_VIEW"),
  validateQuery(complaintListQuerySchema),
  complaintController.listComplaints,
);
complaintRoutes.post(
  "/",
  requirePermission("COMPLAINT_RAISE"),
  validateBody(complaintCreateSchema),
  complaintController.createComplaint,
);
complaintRoutes.get("/:id", requirePermission("COMPLAINT_VIEW"), complaintController.getComplaint);
complaintRoutes.patch(
  "/:id",
  requirePermission("COMPLAINT_WORK"),
  validateBody(complaintUpdateSchema),
  complaintController.updateComplaint,
);
complaintRoutes.post(
  "/:id/assign",
  requirePermission("COMPLAINT_MANAGE"),
  validateBody(complaintAssignSchema),
  complaintController.assignComplaint,
);
complaintRoutes.post(
  "/:id/comments",
  requirePermission("COMPLAINT_VIEW"),
  validateBody(complaintCommentCreateSchema),
  complaintController.addComment,
);
complaintRoutes.post(
  "/:id/rating",
  requirePermission("COMPLAINT_RAISE"),
  validateBody(complaintRatingSchema),
  complaintController.rateComplaint,
);
