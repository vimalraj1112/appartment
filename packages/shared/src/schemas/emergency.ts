import { z } from "zod";
import { EMERGENCY_ALERT_STATUSES, EMERGENCY_CATEGORIES } from "../enums.js";

export const emergencyTriggerSchema = z.object({
  category: z.enum(EMERGENCY_CATEGORIES),
  note: z.string().trim().max(1000).optional(),
  flatId: z.string().uuid().optional(),
});
export type EmergencyTriggerInput = z.infer<typeof emergencyTriggerSchema>;

export const emergencyNoteSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});
export type EmergencyNoteInput = z.infer<typeof emergencyNoteSchema>;

export const emergencyListQuerySchema = z.object({
  status: z.enum(EMERGENCY_ALERT_STATUSES).optional(),
  category: z.enum(EMERGENCY_CATEGORIES).optional(),
  flatId: z.string().uuid().optional(),
  mine: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type EmergencyListQuery = z.infer<typeof emergencyListQuerySchema>;

export { EMERGENCY_ALERT_STATUSES, EMERGENCY_CATEGORIES };
