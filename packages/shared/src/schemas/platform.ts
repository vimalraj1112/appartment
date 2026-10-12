import { z } from "zod";
import { COMMUNITY_STATUSES, SUBSCRIPTION_STATUSES } from "../enums.js";

export const platformCommunityListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(COMMUNITY_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PlatformCommunityListQuery = z.infer<typeof platformCommunityListQuerySchema>;

export const platformCreateCommunitySchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  address: z.string().trim().max(240).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  planCode: z.string().trim().min(1).max(40).optional(),
});
export type PlatformCreateCommunityInput = z.infer<typeof platformCreateCommunitySchema>;

export const platformCommunityStatusSchema = z.object({
  status: z.enum(COMMUNITY_STATUSES),
});
export type PlatformCommunityStatusInput = z.infer<typeof platformCommunityStatusSchema>;

export const platformPlanSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes.")
    .min(2)
    .max(40),
  name: z.string().trim().min(2).max(80),
  priceMonthlyInr: z.coerce.number().int().min(0).max(1_000_000),
  flatLimit: z.coerce.number().int().min(0).max(100_000),
  features: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
});
export type PlatformPlanInput = z.infer<typeof platformPlanSchema>;

export const platformPlanUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  priceMonthlyInr: z.coerce.number().int().min(0).max(1_000_000).optional(),
  flatLimit: z.coerce.number().int().min(0).max(100_000).optional(),
  features: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  isActive: z.boolean().optional(),
});
export type PlatformPlanUpdateInput = z.infer<typeof platformPlanUpdateSchema>;

export const platformSubscriptionListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PlatformSubscriptionListQuery = z.infer<typeof platformSubscriptionListQuerySchema>;

export const platformAssignSubscriptionSchema = z.object({
  planCode: z.string().trim().min(1).max(40).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});
export type PlatformAssignSubscriptionInput = z.infer<typeof platformAssignSubscriptionSchema>;

export const platformAuditQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  action: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PlatformAuditQuery = z.infer<typeof platformAuditQuerySchema>;
