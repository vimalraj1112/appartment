import type { RequestHandler } from "express";
import { can, type Capability, type Role } from "@superlink/shared";
import { AppError } from "../errors/AppError.js";
import { currentAuth, getStore } from "../tenant/context.js";

export const requireAuth: RequestHandler = (_req, _res, next) => {
  if (!currentAuth()) {
    next(AppError.unauthorized());
    return;
  }
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (_req, _res, next) => {
    const auth = currentAuth();
    if (!auth) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(auth.role)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}

export function requirePermission(capability: Capability): RequestHandler {
  return (_req, _res, next) => {
    const auth = currentAuth();
    if (!auth) {
      next(AppError.unauthorized());
      return;
    }
    if (!can(auth.role, capability)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}

/** Grants access when the role holds at least one of the listed capabilities. */
export function requireAnyPermission(...capabilities: Capability[]): RequestHandler {
  return (_req, _res, next) => {
    const auth = currentAuth();
    if (!auth) {
      next(AppError.unauthorized());
      return;
    }
    if (!capabilities.some((capability) => can(auth.role, capability))) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}

/** Reads the authenticated context (throws if the request is unauthenticated). */
export function authContextOrThrow() {
  const auth = currentAuth();
  if (!auth || getStore()?.unauthenticated) {
    throw AppError.unauthorized();
  }
  return auth;
}
