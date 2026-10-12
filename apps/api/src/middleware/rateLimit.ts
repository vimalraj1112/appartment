import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError("RATE_LIMITED", "Too many requests. Please wait a moment and try again."));
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, _res, next) => {
    next(
      new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again."),
    );
  },
});
