import { AsyncLocalStorage } from "node:async_hooks";
import type { Role } from "@superlink/shared";

export interface AuthContext {
  userId: string;
  communityId: string | null;
  role: Role;
  sessionId: string;
  /** System/bypass contexts skip tenant injection (identity lookups, jobs, platform paths). */
  bypass: boolean;
}

export interface RequestStore {
  requestId: string;
  ip: string | undefined;
  auth?: AuthContext;
  /** Set on every request until authenticate() succeeds. Tenant models are blocked without auth. */
  unauthenticated: boolean;
}

const storage = new AsyncLocalStorage<RequestStore>();

export function runWithStore<T>(store: RequestStore, fn: () => T): T {
  return storage.run(store, fn);
}

export function getStore(): RequestStore | undefined {
  return storage.getStore();
}

const SYSTEM_AUTH: AuthContext = {
  userId: "",
  communityId: null,
  role: "SUPER_ADMIN",
  sessionId: "",
  bypass: true,
};

/**
 * Explicit, greppable escape hatch for cross-tenant/system work
 * (identity lookups during auth, seed jobs, background workers).
 * The callback is awaited *inside* the system context so lazily-executed
 * Prisma queries run while the context is still active.
 */
export function runAsSystem<T>(fn: () => Promise<T>): Promise<T> {
  const prev = storage.getStore();
  return storage.run(
    {
      requestId: prev?.requestId ?? "system",
      ip: prev?.ip,
      auth: SYSTEM_AUTH,
      unauthenticated: false,
    },
    async () => await fn(),
  );
}

export function currentAuth(): AuthContext | null {
  return storage.getStore()?.auth ?? null;
}
