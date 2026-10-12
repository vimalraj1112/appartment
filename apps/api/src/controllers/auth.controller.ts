import type { Request, Response } from "express";
import * as authService from "../services/auth.service.js";
import { ok } from "../utils/respond.js";
import { clearRefreshCookie, setRefreshCookie } from "../utils/cookies.js";
import { authContextOrThrow } from "../middleware/rbac.js";
import { env } from "../config/env.js";

function refreshCookie(req: Request): string | undefined {
  return req.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const result = await authService.login({
    email,
    password,
    ip: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });
  setRefreshCookie(res, result.refreshToken);
  ok(res, { user: result.user, accessToken: result.accessToken });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const result = await authService.refresh({
    refreshToken: refreshCookie(req),
    ip: req.ip,
    userAgent: req.header("user-agent") ?? undefined,
  });
  setRefreshCookie(res, result.refreshToken);
  ok(res, { user: result.user, accessToken: result.accessToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout({ refreshToken: refreshCookie(req), ip: req.ip });
  clearRefreshCookie(res);
  ok(res, { loggedOut: true });
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  const auth = authContextOrThrow();
  await authService.logoutAll({ userId: auth.userId, ip: req.ip });
  clearRefreshCookie(res);
  ok(res, { loggedOut: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  const auth = authContextOrThrow();
  const user = await authService.getMe(auth.userId);
  ok(res, user);
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  await authService.forgotPassword({ email, ip: req.ip });
  ok(res, {
    message: "If an account exists for that email, a reset link has been sent.",
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token: string; password: string };
  await authService.resetPassword({ token, password, ip: req.ip });
  clearRefreshCookie(res);
  ok(res, { passwordReset: true });
}
