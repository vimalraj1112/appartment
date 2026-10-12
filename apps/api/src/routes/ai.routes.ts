import { Router } from "express";
import { aiCreateConversationSchema, aiSendMessageSchema } from "@superlink/shared";
import * as aiController from "../controllers/ai.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission, requirePermission } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";

/**
 * Read-only, tools-only AI assistant. Every role reaches the assistant, but the
 * tools each role may invoke are limited by their AI capability tier
 * (AI_COMMUNITY / AI_OWN / AI_HELP) inside the service.
 */
export const aiRoutes: Router = Router();

aiRoutes.use(authenticate);
aiRoutes.use(requireAnyPermission("AI_COMMUNITY", "AI_OWN", "AI_HELP"));

aiRoutes.get("/tools", aiController.listTools);
aiRoutes.get("/conversations", aiController.listConversations);
aiRoutes.post(
  "/conversations",
  validateBody(aiCreateConversationSchema),
  aiController.createConversation,
);
aiRoutes.get("/conversations/:id", aiController.getConversation);
aiRoutes.delete("/conversations/:id", aiController.deleteConversation);
aiRoutes.post(
  "/conversations/:id/messages",
  validateBody(aiSendMessageSchema),
  aiController.sendMessage,
);
aiRoutes.get("/digest", requirePermission("AI_COMMUNITY"), aiController.digest);
