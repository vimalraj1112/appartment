export const ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "RATE_LIMITED",
  "PAYMENT_FAILED",
  "INTERNAL",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
  details?: Array<{ path: string; message: string }>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
