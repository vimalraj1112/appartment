import { prisma } from "../config/prisma.js";
import { getStore } from "../tenant/context.js";

export interface AuditInput {
  action: string;
  resource?: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  /** Override when the request store has no auth yet (e.g. login). */
  communityId?: string | null;
  userId?: string | null;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  const store = getStore();
  const communityId =
    input.communityId !== undefined ? input.communityId : (store?.auth?.communityId ?? null);
  const userId = input.userId !== undefined ? input.userId : (store?.auth?.userId || null);

  try {
    await prisma.auditLog.create({
      data: {
        communityId,
        userId: userId || null,
        action: input.action,
        resource: input.resource ?? null,
        resourceId: input.resourceId ?? null,
        meta: input.meta ?? undefined,
        ip: input.ip ?? store?.ip ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
