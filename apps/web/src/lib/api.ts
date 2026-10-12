import type { ApiFailure, ApiSuccess, PaginationMeta } from "@superlink/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Array<{ path: string; message: string }> | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken: string | null = null;
let onRefresh: (() => Promise<string>) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function configureRefresh(handler: () => Promise<string>): void {
  onRefresh = handler;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Attach the access token and transparently refresh on 401. Defaults to true. */
  auth?: boolean;
}

async function parse<T>(response: Response): Promise<ApiSuccess<T>> {
  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (!response.ok) {
    const failure = payload as ApiFailure | null;
    throw new ApiError(
      response.status,
      failure?.error?.code ?? "INTERNAL",
      failure?.error?.message ?? "Something went wrong. Please try again.",
      failure?.details,
    );
  }

  return payload as ApiSuccess<T>;
}

async function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
}

async function execute<T>(path: string, options: RequestOptions): Promise<ApiSuccess<T>> {
  const useAuth = options.auth !== false;
  const token = useAuth ? accessToken : null;

  let response = await send(path, options, token);

  if (response.status === 401 && useAuth && onRefresh) {
    try {
      const fresh = await onRefresh();
      response = await send(path, options, fresh);
    } catch {
      // Fall through and surface the original error.
    }
  }

  return parse<T>(response);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await execute<T>(path, options);
  return payload.data;
}

export interface Page<T> {
  data: T[];
  meta?: PaginationMeta;
}

export async function apiRequestPage<T>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
  const payload = await execute<T[]>(path, options);
  return { data: payload.data, meta: (payload.meta as PaginationMeta | undefined) ?? undefined };
}
