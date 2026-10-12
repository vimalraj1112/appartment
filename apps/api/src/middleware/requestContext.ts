import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { runWithStore } from "../tenant/context.js";

export const requestContext: RequestHandler = (req, res, next) => {
  const headerId = req.header("x-request-id");
  const requestId = headerId && headerId.length <= 64 ? headerId : randomUUID();
  res.setHeader("x-request-id", requestId);
  runWithStore({ requestId, ip: req.ip, unauthenticated: true }, () => next());
};
