import { Router } from "express";
import {
  commentCreateSchema,
  moderationSchema,
  postCreateSchema,
  postListQuerySchema,
  reactionSchema,
  reportCreateSchema,
  reportListQuerySchema,
  reportResolveSchema,
} from "@superlink/shared";
import * as feedController from "../controllers/feed.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requirePermission } from "../middleware/rbac.js";
import { validateBody, validateQuery } from "../middleware/validate.js";

export const feedRoutes: Router = Router();

feedRoutes.use(authenticate);

// Community feed (CA + RESIDENT)
feedRoutes.get(
  "/posts",
  requirePermission("FEED_WRITE"),
  validateQuery(postListQuerySchema),
  feedController.listPosts,
);
feedRoutes.post(
  "/posts",
  requirePermission("FEED_WRITE"),
  validateBody(postCreateSchema),
  feedController.createPost,
);
feedRoutes.get("/posts/:id", requirePermission("FEED_WRITE"), feedController.getPost);
feedRoutes.delete("/posts/:id", requirePermission("FEED_WRITE"), feedController.deletePost);
feedRoutes.post(
  "/posts/:id/comments",
  requirePermission("FEED_WRITE"),
  validateBody(commentCreateSchema),
  feedController.addComment,
);
feedRoutes.post(
  "/posts/:id/reactions",
  requirePermission("FEED_WRITE"),
  validateBody(reactionSchema),
  feedController.reactPost,
);
feedRoutes.post(
  "/posts/:id/reports",
  requirePermission("FEED_WRITE"),
  validateBody(reportCreateSchema),
  feedController.reportPost,
);
feedRoutes.delete("/comments/:id", requirePermission("FEED_WRITE"), feedController.deleteComment);

// Moderation (CA)
feedRoutes.get(
  "/reports",
  requirePermission("FEED_MODERATE"),
  validateQuery(reportListQuerySchema),
  feedController.listReports,
);
feedRoutes.patch(
  "/reports/:id",
  requirePermission("FEED_MODERATE"),
  validateBody(reportResolveSchema),
  feedController.resolveReport,
);
feedRoutes.patch(
  "/posts/:id/moderation",
  requirePermission("FEED_MODERATE"),
  validateBody(moderationSchema),
  feedController.moderatePost,
);
