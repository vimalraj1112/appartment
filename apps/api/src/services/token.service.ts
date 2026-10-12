import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@superlink/shared";
import { env } from "../config/env.js";

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  cid: string | null;
  sid: string;
}

export async function signAccessToken(input: {
  userId: string;
  role: Role;
  communityId: string | null;
  sessionId: string;
}): Promise<string> {
  return new SignJWT({ role: input.role, cid: input.communityId, sid: input.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  const sub = typeof payload.sub === "string" ? payload.sub : null;
  const sid = typeof payload.sid === "string" ? payload.sid : null;
  const role = typeof payload.role === "string" ? payload.role : null;
  const cid = typeof payload.cid === "string" ? (payload.cid as string) : null;

  if (!sub || !sid || !role) {
    throw new Error("Malformed access token");
  }

  return { sub, sid, role: role as Role, cid };
}
