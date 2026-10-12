import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "./AppError.js";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError("NOT_FOUND", "This endpoint does not exist."));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Please check the highlighted fields." },
      details,
    });
    return;
  }

  const bodyParserType = (err as { type?: string }).type;
  if (bodyParserType === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "The request body is not valid JSON." },
    });
    return;
  }
  if (bodyParserType === "entity.too.large") {
    res.status(413).json({
      success: false,
      error: { code: "PAYLOAD_TOO_LARGE", message: "The request payload is too large." },
    });
    return;
  }

  const httpStatus = (err as { status?: number; statusCode?: number }).status
    ?? (err as { statusCode?: number }).statusCode;
  if (typeof httpStatus === "number" && httpStatus >= 400 && httpStatus < 500) {
    res.status(httpStatus).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "The request could not be processed." },
    });
    return;
  }

  const prismaCode = (err as { code?: string }).code;
  if (prismaCode === "P2002") {
    res.status(409).json({
      success: false,
      error: { code: "CONFLICT", message: "That value is already in use." },
    });
    return;
  }
  if (prismaCode === "P2025") {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "We could not find that record." },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL",
      message: "Something went wrong on our end. Please try again.",
    },
  });
};
