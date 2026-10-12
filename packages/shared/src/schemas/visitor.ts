import { z } from "zod";
import {
  DELIVERY_CATEGORIES,
  DELIVERY_STATUSES,
  VISITOR_ENTRY_DIRECTIONS,
  VISITOR_ENTRY_METHODS,
  VISITOR_PASS_STATUSES,
  VISITOR_PASS_TYPES,
  WATCHLIST_TYPES,
} from "../enums.js";
import { emailSchema } from "./auth.js";

const phoneSchema = z.string().trim().min(6).max(20);

export const visitorPassCreateSchema = z
  .object({
    visitorName: z.string().trim().min(1, "Visitor name is required").max(80),
    visitorPhone: phoneSchema.optional(),
    visitorEmail: emailSchema.optional(),
    purpose: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(500).optional(),
    flatId: z.string().uuid().optional(),
    type: z.enum(VISITOR_PASS_TYPES).default("SINGLE_USE"),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    maxUses: z.coerce.number().int().min(1).max(50).optional(),
  })
  .refine((value) => value.type !== "TIME_WINDOW" || value.validTo !== undefined, {
    path: ["validTo"],
    message: "A time-window pass needs a valid-until date.",
  });
export type VisitorPassCreateInput = z.infer<typeof visitorPassCreateSchema>;

export const visitorPassListQuerySchema = z.object({
  status: z.enum(VISITOR_PASS_STATUSES).optional(),
  flatId: z.string().uuid().optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type VisitorPassListQuery = z.infer<typeof visitorPassListQuerySchema>;

export const visitorPassDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().trim().max(500).optional(),
});
export type VisitorPassDecisionInput = z.infer<typeof visitorPassDecisionSchema>;

export const visitorWalkInSchema = z.object({
  name: z.string().trim().min(1, "Visitor name is required").max(80),
  phone: phoneSchema.optional(),
  flatId: z.string().uuid(),
  purpose: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});
export type VisitorWalkInInput = z.infer<typeof visitorWalkInSchema>;

export const visitorVerifySchema = z.object({
  code: z.string().trim().min(4).max(120),
});
export type VisitorVerifyInput = z.infer<typeof visitorVerifySchema>;

export const visitorEntryCreateSchema = z.object({
  passId: z.string().uuid().optional(),
  visitorId: z.string().uuid(),
  direction: z.enum(VISITOR_ENTRY_DIRECTIONS),
  method: z.enum(VISITOR_ENTRY_METHODS).default("MANUAL"),
  note: z.string().trim().max(200).optional(),
});
export type VisitorEntryCreateInput = z.infer<typeof visitorEntryCreateSchema>;

export const visitorEntryListQuerySchema = z.object({
  flatId: z.string().uuid().optional(),
  direction: z.enum(VISITOR_ENTRY_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type VisitorEntryListQuery = z.infer<typeof visitorEntryListQuerySchema>;

export const deliveryCreateSchema = z.object({
  flatId: z.string().uuid().optional(),
  category: z.enum(DELIVERY_CATEGORIES).default("OTHER"),
  company: z.string().trim().max(80).optional(),
  personName: z.string().trim().max(80).optional(),
  phone: phoneSchema.optional(),
  note: z.string().trim().max(300).optional(),
  status: z.enum(DELIVERY_STATUSES).optional(),
});
export type DeliveryCreateInput = z.infer<typeof deliveryCreateSchema>;

export const deliveryListQuerySchema = z.object({
  status: z.enum(DELIVERY_STATUSES).optional(),
  flatId: z.string().uuid().optional(),
  category: z.enum(DELIVERY_CATEGORIES).optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type DeliveryListQuery = z.infer<typeof deliveryListQuerySchema>;

export const deliveryStatusUpdateSchema = z.object({
  status: z.enum(DELIVERY_STATUSES),
  note: z.string().trim().max(200).optional(),
});
export type DeliveryStatusUpdateInput = z.infer<typeof deliveryStatusUpdateSchema>;

export const watchlistCreateSchema = z.object({
  type: z.enum(WATCHLIST_TYPES),
  name: z.string().trim().min(1, "Name is required").max(80),
  value: z.string().trim().max(80).optional(),
  reason: z.string().trim().min(1, "Reason is required").max(300),
});
export type WatchlistCreateInput = z.infer<typeof watchlistCreateSchema>;

export const watchlistListQuerySchema = z.object({
  type: z.enum(WATCHLIST_TYPES).optional(),
  q: z.string().trim().max(60).optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type WatchlistListQuery = z.infer<typeof watchlistListQuerySchema>;
