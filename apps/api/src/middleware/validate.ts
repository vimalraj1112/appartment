import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors/AppError.js";

export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      next(AppError.validation("Please check the highlighted fields.", details));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      next(AppError.validation("Please check the query parameters.", details));
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
}
