import { z } from "zod";
import { BOOKING_STATUSES } from "../enums.js";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const amenityUpsertSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  icon: z.string().trim().max(60).optional(),
  description: z.string().trim().max(300).optional(),
  slotMinutes: z.coerce.number().int().min(15).max(480).default(60),
  capacity: z.coerce.number().int().min(1).max(500).default(1),
  openTime: z.string().regex(TIME_PATTERN, "Use HH:MM").default("06:00"),
  closeTime: z.string().regex(TIME_PATTERN, "Use HH:MM").default("22:00"),
  feeInr: z.coerce.number().int().min(0).max(10_000_000).default(0),
  rules: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true),
});
export type AmenityUpsertInput = z.infer<typeof amenityUpsertSchema>;

export const amenityListQuerySchema = z.object({
  activeOnly: z.coerce.boolean().optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AmenityListQuery = z.infer<typeof amenityListQuerySchema>;

export const amenityAvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});
export type AmenityAvailabilityQuery = z.infer<typeof amenityAvailabilityQuerySchema>;

export const bookingCreateSchema = z.object({
  amenityId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  slotStart: z.coerce.date(),
  flatId: z.string().uuid().optional(),
  guests: z.coerce.number().int().min(0).max(50).default(0),
  note: z.string().trim().max(300).optional(),
});
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

export const bookingListQuerySchema = z.object({
  amenityId: z.string().uuid().optional(),
  flatId: z.string().uuid().optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  mine: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

export const bookingCancelSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
export type BookingCancelInput = z.infer<typeof bookingCancelSchema>;

export { BOOKING_STATUSES };
