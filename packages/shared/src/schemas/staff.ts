import { z } from "zod";
import {
  DOMESTIC_STAFF_STATUSES,
  DOMESTIC_WORK_TYPES,
  STAFF_AVAILABILITIES,
  VISITOR_ENTRY_DIRECTIONS,
} from "../enums.js";

const phoneSchema = z.string().trim().min(6).max(20);

export const staffProfileCreateSchema = z.object({
  userId: z.string().uuid(),
  trade: z.string().trim().min(1, "Trade is required").max(60),
  availability: z.enum(STAFF_AVAILABILITIES).default("AVAILABLE"),
  phone: phoneSchema.optional(),
});
export type StaffProfileCreateInput = z.infer<typeof staffProfileCreateSchema>;

export const staffProfileUpdateSchema = z.object({
  trade: z.string().trim().min(1).max(60).optional(),
  availability: z.enum(STAFF_AVAILABILITIES).optional(),
  phone: phoneSchema.nullable().optional(),
});
export type StaffProfileUpdateInput = z.infer<typeof staffProfileUpdateSchema>;

export const staffProfileListQuerySchema = z.object({
  trade: z.string().trim().max(60).optional(),
  availability: z.enum(STAFF_AVAILABILITIES).optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type StaffProfileListQuery = z.infer<typeof staffProfileListQuerySchema>;

export const staffEntryCreateSchema = z.object({
  staffUserId: z.string().uuid(),
  direction: z.enum(VISITOR_ENTRY_DIRECTIONS),
  note: z.string().trim().max(200).optional(),
});
export type StaffEntryCreateInput = z.infer<typeof staffEntryCreateSchema>;

export const staffEntryListQuerySchema = z.object({
  staffUserId: z.string().uuid().optional(),
  direction: z.enum(VISITOR_ENTRY_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type StaffEntryListQuery = z.infer<typeof staffEntryListQuerySchema>;

export const domesticStaffCreateSchema = z.object({
  flatId: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Name is required").max(80),
  phone: phoneSchema.optional(),
  idInfo: z.string().trim().max(80).optional(),
  workType: z.enum(DOMESTIC_WORK_TYPES).default("MAID"),
  status: z.enum(DOMESTIC_STAFF_STATUSES).optional(),
});
export type DomesticStaffCreateInput = z.infer<typeof domesticStaffCreateSchema>;

export const domesticStaffUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: phoneSchema.nullable().optional(),
  idInfo: z.string().trim().max(80).nullable().optional(),
  workType: z.enum(DOMESTIC_WORK_TYPES).optional(),
  status: z.enum(DOMESTIC_STAFF_STATUSES).optional(),
});
export type DomesticStaffUpdateInput = z.infer<typeof domesticStaffUpdateSchema>;

export const domesticStaffListQuerySchema = z.object({
  flatId: z.string().uuid().optional(),
  workType: z.enum(DOMESTIC_WORK_TYPES).optional(),
  status: z.enum(DOMESTIC_STAFF_STATUSES).optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type DomesticStaffListQuery = z.infer<typeof domesticStaffListQuerySchema>;
