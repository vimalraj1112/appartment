import { z } from "zod";
import { POST_REPORT_STATUSES, POST_STATUSES } from "../enums.js";

export const postCreateSchema = z.object({
  body: z.string().trim().min(1, "Write something to post").max(3000),
});
export type PostCreateInput = z.infer<typeof postCreateSchema>;

export const postListQuerySchema = z.object({
  status: z.enum(POST_STATUSES).optional(),
  mine: z.coerce.boolean().optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PostListQuery = z.infer<typeof postListQuerySchema>;

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(1000),
});
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;

export const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});
export type ReactionInput = z.infer<typeof reactionSchema>;

export const reportCreateSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

export const moderationSchema = z.object({
  status: z.enum(POST_STATUSES),
  reason: z.string().trim().max(300).optional(),
});
export type ModerationInput = z.infer<typeof moderationSchema>;

export const reportListQuerySchema = z.object({
  status: z.enum(POST_REPORT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export const reportResolveSchema = z.object({
  status: z.enum(POST_REPORT_STATUSES),
});
export type ReportResolveInput = z.infer<typeof reportResolveSchema>;

export { POST_REPORT_STATUSES, POST_STATUSES };
