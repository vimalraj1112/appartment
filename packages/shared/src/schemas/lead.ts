import { z } from "zod";
import { DEMO_LEAD_STATUSES } from "../enums.js";
import { emailSchema } from "./auth.js";

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(80),
  email: emailSchema,
  phone: z.string().trim().min(6, "Enter a contact number.").max(20),
  communityName: z.string().trim().min(2, "Community name is required.").max(120),
  flats: z.coerce.number().int().min(1).max(100_000).optional(),
  message: z.string().trim().max(1000).optional(),
});
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

export const leadListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(DEMO_LEAD_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export const leadUpdateSchema = z.object({
  status: z.enum(DEMO_LEAD_STATUSES),
});
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
