import type { ErrorCode } from "@superlink/shared";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYMENT_FAILED: 402,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Array<{ path: string; message: string }>;

  constructor(code: ErrorCode, message: string, details?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static unauthorized(message = "Please sign in to continue.") {
    return new AppError("UNAUTHORIZED", message);
  }
  static forbidden(message = "You do not have permission to do that.") {
    return new AppError("FORBIDDEN", message);
  }
  static notFound(message = "We could not find what you were looking for.") {
    return new AppError("NOT_FOUND", message);
  }
  static conflict(message = "This conflicts with existing data.") {
    return new AppError("CONFLICT", message);
  }
  static validation(message = "Please check the highlighted fields.", details?: Array<{ path: string; message: string }>) {
    return new AppError("VALIDATION_ERROR", message, details);
  }
}
