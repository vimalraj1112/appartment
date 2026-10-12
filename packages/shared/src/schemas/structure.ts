import { z } from "zod";
import { FLAT_STATUSES } from "../enums.js";

export const buildingCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  towerCode: z.string().trim().max(12).optional(),
  floorsCount: z.coerce.number().int().min(0).max(200).default(0),
});
export type BuildingCreateInput = z.infer<typeof buildingCreateSchema>;

export const buildingUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  towerCode: z.string().trim().max(12).nullable().optional(),
  floorsCount: z.coerce.number().int().min(0).max(200).optional(),
});
export type BuildingUpdateInput = z.infer<typeof buildingUpdateSchema>;

export const floorCreateSchema = z.object({
  number: z.coerce.number().int().min(-5).max(200),
  label: z.string().trim().min(1, "Label is required").max(40),
});
export type FloorCreateInput = z.infer<typeof floorCreateSchema>;

export const floorUpdateSchema = floorCreateSchema.partial();
export type FloorUpdateInput = z.infer<typeof floorUpdateSchema>;

export const flatCreateSchema = z.object({
  floorId: z.string().uuid("Select a floor"),
  code: z.string().trim().min(1, "Code is required").max(20),
  type: z.string().trim().max(20).optional(),
  areaSqft: z.coerce.number().int().min(0).max(100000).optional(),
  status: z.enum(FLAT_STATUSES).optional(),
});
export type FlatCreateInput = z.infer<typeof flatCreateSchema>;

export const flatUpdateSchema = z.object({
  floorId: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(20).optional(),
  type: z.string().trim().max(20).nullable().optional(),
  areaSqft: z.coerce.number().int().min(0).max(100000).nullable().optional(),
  status: z.enum(FLAT_STATUSES).optional(),
});
export type FlatUpdateInput = z.infer<typeof flatUpdateSchema>;

export const flatBulkCreateSchema = z.object({
  floorId: z.string().uuid("Select a floor"),
  prefix: z.string().trim().max(10).default(""),
  start: z.coerce.number().int().min(1).max(9999),
  count: z.coerce.number().int().min(1).max(200),
  pad: z.coerce.number().int().min(1).max(6).default(2),
  type: z.string().trim().max(20).optional(),
  areaSqft: z.coerce.number().int().min(0).max(100000).optional(),
});
export type FlatBulkCreateInput = z.infer<typeof flatBulkCreateSchema>;

export const flatListQuerySchema = z.object({
  buildingId: z.string().uuid().optional(),
  floorId: z.string().uuid().optional(),
  status: z.enum(FLAT_STATUSES).optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type FlatListQuery = z.infer<typeof flatListQuerySchema>;
