import { z } from "zod";
import { COMPLAINT_PRIORITIES, COMPLAINT_STATUSES } from "../enums.js";

export const complaintCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(60),
  description: z.string().trim().max(200).optional(),
  slaHours: z.coerce.number().int().min(1).max(720).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
});
export type ComplaintCategoryCreateInput = z.infer<typeof complaintCategoryCreateSchema>;

export const complaintCategoryUpdateSchema = complaintCategoryCreateSchema.partial();
export type ComplaintCategoryUpdateInput = z.infer<typeof complaintCategoryUpdateSchema>;

export const complaintCreateSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(120),
  description: z.string().trim().min(5, "Please describe the issue").max(2000),
  categoryId: z.string().uuid().optional(),
  flatId: z.string().uuid().optional(),
  priority: z.enum(COMPLAINT_PRIORITIES).default("MEDIUM"),
  location: z.string().trim().max(120).optional(),
});
export type ComplaintCreateInput = z.infer<typeof complaintCreateSchema>;

export const complaintListQuerySchema = z.object({
  status: z.enum(COMPLAINT_STATUSES).optional(),
  priority: z.enum(COMPLAINT_PRIORITIES).optional(),
  categoryId: z.string().uuid().optional(),
  flatId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  mine: z.coerce.boolean().optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ComplaintListQuery = z.infer<typeof complaintListQuerySchema>;

export const complaintUpdateSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  priority: z.enum(COMPLAINT_PRIORITIES).optional(),
  status: z.enum(COMPLAINT_STATUSES).optional(),
  location: z.string().trim().max(120).nullable().optional(),
});
export type ComplaintUpdateInput = z.infer<typeof complaintUpdateSchema>;

export const complaintAssignSchema = z.object({
  staffUserId: z.string().uuid(),
  note: z.string().trim().max(300).optional(),
});
export type ComplaintAssignInput = z.infer<typeof complaintAssignSchema>;

export const complaintCommentCreateSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(1000),
  isInternal: z.boolean().optional(),
});
export type ComplaintCommentCreateInput = z.infer<typeof complaintCommentCreateSchema>;

export const complaintRatingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
});
export type ComplaintRatingInput = z.infer<typeof complaintRatingSchema>;
