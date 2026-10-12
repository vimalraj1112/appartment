import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { getStore } from "../tenant/context.js";

/**
 * Models that carry a `communityId` and are therefore auto-scoped by the
 * tenant extension below. Kept in sync with prisma/schema.prisma by
 * tests/tenant-schema.test.ts.
 *
 * AuditLog is intentionally excluded: it is append-only and receives an
 * explicit communityId from the audit service.
 */
export const TENANT_MODELS = new Set([
  "User",
  "CommunitySetting",
  "Subscription",
  "Building",
  "Floor",
  "Flat",
  "FlatOccupant",
  "FamilyMember",
  "ResidentDocument",
  "Invitation",
  "Notification",
  "Visitor",
  "VisitorPass",
  "VisitorEntry",
  "Delivery",
  "DeliveryEntry",
  "WatchlistEntry",
  "ComplaintCategory",
  "Complaint",
  "ComplaintComment",
  "StaffProfile",
  "StaffAssignment",
  "StaffEntry",
  "DomesticStaff",
  "MaintenanceConfig",
  "MaintenanceBill",
  "MaintenanceBillItem",
  "Payment",
  "PaymentReceipt",
  "ExpenseCategory",
  "Expense",
  "Amenity",
  "AmenityBooking",
  "Vehicle",
  "ParkingSlot",
  "ParkingAssignment",
  "ParkingVisitor",
  "Announcement",
  "AnnouncementAck",
  "CommunityPost",
  "CommunityComment",
  "CommunityReaction",
  "PostReport",
  "EmergencyAlert",
  "AiToolCall",
]);

type Args = Record<string, unknown>;

function withForcedWhere(args: Args, communityId: string): Args {
  const where = (args.where ?? {}) as Args;
  return { ...args, where: { ...where, communityId } };
}

function withForcedCreate(args: Args, communityId: string): Args {
  const data = Array.isArray(args.data)
    ? (args.data as Args[]).map((d) => ({ ...d, communityId }))
    : ({ ...(args.data as Args), communityId } as Args);
  return { ...args, data };
}

function stripCommunityIdFromWrite(args: Args): Args {
  const data = args.data as Args | Args[] | undefined;
  if (!data) return args;
  if (Array.isArray(data)) {
    return { ...args, data: data.map((d) => omitCommunityId(d)) };
  }
  return { ...args, data: omitCommunityId(data) };
}

function omitCommunityId(data: Args): Args {
  if (!("communityId" in data)) return data;
  const { communityId: _ignored, ...rest } = data;
  return rest;
}

const base = new PrismaClient({
  log: process.env.NODE_ENV === "test" ? ["error"] : ["warn", "error"],
});

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_MODELS.has(model)) {
          return query(args);
        }

        const store = getStore();

        // No store = trusted script/job context (seed, background workers).
        if (!store) return query(args);

        // Authenticated tenants only: unauthenticated requests are blocked
        // from touching tenant-owned models entirely.
        if (store.unauthenticated || !store.auth) {
          throw new AppError("FORBIDDEN", "Sign in to access this resource.");
        }

        // System bypass and platform admins (communityId === null) skip injection.
        const { auth } = store;
        if (auth.bypass || auth.communityId === null) return query(args);

        const scoped = withForcedWhere(args as Args, auth.communityId) as typeof args;

        switch (operation) {
          case "create":
          case "createMany":
            return query(withForcedCreate(args as Args, auth.communityId) as typeof args);
          case "update":
          case "updateMany":
            return query(
              stripCommunityIdFromWrite(withForcedWhere(args as Args, auth.communityId)) as typeof args,
            );
          case "upsert": {
            const where = (args.where ?? {}) as Args;
            const create = (args.create ?? {}) as Args;
            return query({
              ...args,
              where: { ...where, communityId: auth.communityId },
              create: { ...create, communityId: auth.communityId },
            } as typeof args);
          }
          case "findUnique":
          case "findUniqueOrThrow":
          case "findFirst":
          case "findFirstOrThrow":
          case "findMany":
          case "count":
          case "aggregate":
          case "groupBy":
          case "delete":
          case "deleteMany":
            return query(scoped);
          default:
            return query(args);
        }
      },
    },
  },
});

export type ScopedPrismaClient = typeof prisma;
