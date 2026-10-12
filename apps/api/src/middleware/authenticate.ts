import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { getStore } from "../tenant/context.js";
import { prisma } from "../config/prisma.js";
import { verifyAccessToken } from "../services/token.service.js";

/**
 * Verifies the Bearer access token, checks the server-side session is still
 * active, and installs the tenant auth context for this request.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header("authorization");
    if (!header || !header.startsWith("Bearer ")) {
      throw AppError.unauthorized();
    }

    let payload;
    try {
      payload = await verifyAccessToken(header.slice(7));
    } catch {
      throw AppError.unauthorized("Your session has expired. Please sign in again.");
    }

    const session = await prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw AppError.unauthorized("Your session has expired. Please sign in again.");
    }

    const store = getStore();
    if (!store) throw AppError.unauthorized();
    store.auth = {
      userId: payload.sub,
      communityId: payload.cid,
      role: payload.role,
      sessionId: payload.sid,
      bypass: false,
    };
    store.unauthenticated = false;
    next();
  } catch (err) {
    next(err);
  }
};
