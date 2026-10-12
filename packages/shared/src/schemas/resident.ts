import { z } from "zod";
import { OCCUPANT_RELATIONS, USER_STATUSES } from "../enums.js";
import { emailSchema } from "./auth.js";

export const residentCreateSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  phone: z.string().trim().min(6).max(20).optional(),
  flatId: z.string().uuid().optional(),
  relation: z.enum(OCCUPANT_RELATIONS).optional(),
});
export type ResidentCreateInput = z.infer<typeof residentCreateSchema>;

export const residentListQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  status: z.enum(USER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ResidentListQuery = z.infer<typeof residentListQuerySchema>;

export const residentUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().min(6).max(20).nullable().optional(),
  status: z.enum(USER_STATUSES).optional(),
});
export type ResidentUpdateInput = z.infer<typeof residentUpdateSchema>;

export const assignFlatSchema = z.object({
  flatId: z.string().uuid(),
  relation: z.enum(OCCUPANT_RELATIONS),
  isPrimary: z.boolean().optional(),
});
export type AssignFlatInput = z.infer<typeof assignFlatSchema>;

export const familyMemberCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  relation: z.string().trim().min(1).max(40),
  phone: z.string().trim().min(6).max(20).optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  isStaff: z.boolean().optional(),
});
export type FamilyMemberCreateInput = z.infer<typeof familyMemberCreateSchema>;
