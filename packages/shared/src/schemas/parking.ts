import { z } from "zod";
import { PARKING_SLOT_STATUSES } from "../enums.js";

export const parkingSlotCreateSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(30),
  zone: z.string().trim().max(60).optional(),
  status: z.enum(PARKING_SLOT_STATUSES).default("AVAILABLE"),
});
export type ParkingSlotCreateInput = z.infer<typeof parkingSlotCreateSchema>;

export const parkingSlotUpdateSchema = parkingSlotCreateSchema.partial();
export type ParkingSlotUpdateInput = z.infer<typeof parkingSlotUpdateSchema>;

export const parkingSlotListQuerySchema = z.object({
  status: z.enum(PARKING_SLOT_STATUSES).optional(),
  zone: z.string().trim().max(60).optional(),
  q: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});
export type ParkingSlotListQuery = z.infer<typeof parkingSlotListQuerySchema>;

export const parkingAssignmentCreateSchema = z.object({
  slotId: z.string().uuid(),
  flatId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});
export type ParkingAssignmentCreateInput = z.infer<typeof parkingAssignmentCreateSchema>;

export const parkingAssignmentEndSchema = z.object({
  endsAt: z.coerce.date().optional(),
});
export type ParkingAssignmentEndInput = z.infer<typeof parkingAssignmentEndSchema>;

export const parkingAssignmentListQuerySchema = z.object({
  slotId: z.string().uuid().optional(),
  flatId: z.string().uuid().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ParkingAssignmentListQuery = z.infer<typeof parkingAssignmentListQuerySchema>;

export const parkingVisitorCreateSchema = z.object({
  regNumber: z.string().trim().min(3, "Registration number is required").max(20),
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  slotId: z.string().uuid().optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
  note: z.string().trim().max(300).optional(),
});
export type ParkingVisitorCreateInput = z.infer<typeof parkingVisitorCreateSchema>;

export const parkingVisitorListQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ParkingVisitorListQuery = z.infer<typeof parkingVisitorListQuerySchema>;

export { PARKING_SLOT_STATUSES };
