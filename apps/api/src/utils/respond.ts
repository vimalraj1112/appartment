import type { Response } from "express";
import type { ApiSuccess, PaginationMeta } from "@superlink/shared";

export function ok<T>(res: Response, data: T, meta?: PaginationMeta | Record<string, unknown>): Response {
  const body: ApiSuccess<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.json(body);
}
