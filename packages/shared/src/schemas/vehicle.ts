import { z } from "zod";
import { VEHICLE_TYPES } from "../enums.js";

export const vehicleCreateSchema = z.object({
  regNumber: z.string().trim().min(3, "Registration number is required").max(20),
  type: z.enum(VEHICLE_TYPES).default("CAR"),
  brand: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  color: z.string().trim().max(40).optional(),
  flatId: z.string().uuid().optional(),
  isGuest: z.boolean().default(false),
  guestExpiresAt: z.coerce.date().optional(),
});
export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;

export const vehicleUpdateSchema = vehicleCreateSchema.partial();
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;

export const vehicleListQuerySchema = z.object({
  type: z.enum(VEHICLE_TYPES).optional(),
  flatId: z.string().uuid().optional(),
  q: z.string().trim().max(40).optional(),
  mine: z.coerce.boolean().optional(),
  guestsOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type VehicleListQuery = z.infer<typeof vehicleListQuerySchema>;

export { VEHICLE_TYPES };
