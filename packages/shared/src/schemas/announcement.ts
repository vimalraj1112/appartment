import { z } from "zod";
import { ANNOUNCEMENT_STATUSES, ANNOUNCEMENT_TYPES } from "../enums.js";

export const announcementCreateSchema = z.object({
  type: z.enum(ANNOUNCEMENT_TYPES).default("GENERAL"),
  title: z.string().trim().min(1, "Title is required").max(140),
  body: z.string().trim().min(1, "Body is required").max(5000),
  status: z.enum(ANNOUNCEMENT_STATUSES).default("PUBLISHED"),
  publishAt: z.coerce.date().optional(),
  pinnedUntil: z.coerce.date().optional(),
});
export type AnnouncementCreateInput = z.infer<typeof announcementCreateSchema>;

export const announcementUpdateSchema = announcementCreateSchema.partial();
export type AnnouncementUpdateInput = z.infer<typeof announcementUpdateSchema>;

export const announcementListQuerySchema = z.object({
  type: z.enum(ANNOUNCEMENT_TYPES).optional(),
  status: z.enum(ANNOUNCEMENT_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type AnnouncementListQuery = z.infer<typeof announcementListQuerySchema>;

export { ANNOUNCEMENT_STATUSES, ANNOUNCEMENT_TYPES };
