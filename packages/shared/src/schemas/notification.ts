import { z } from "zod";
import { NOTIFICATION_TYPES } from "../enums.js";

export const notificationListQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const notificationCreateSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(NOTIFICATION_TYPES).default("GENERAL"),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(1000),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;
