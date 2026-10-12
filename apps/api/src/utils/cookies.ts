import type { Response } from "express";
import { env, isProd } from "../config/env.js";

const COOKIE_PATH = "/api/v1/auth";

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(env.REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: env.REFRESH_COOKIE_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: COOKIE_PATH,
  });
}
