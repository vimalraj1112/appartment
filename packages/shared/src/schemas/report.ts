import { z } from "zod";

export const reportTrendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});
export type ReportTrendQuery = z.infer<typeof reportTrendQuerySchema>;

export const handoverQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type HandoverQuery = z.infer<typeof handoverQuerySchema>;
