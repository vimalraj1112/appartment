import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { verifyAccessToken, type AccessTokenPayload } from "../services/token.service.js";

export type SocketAuth = AccessTokenPayload;

interface ServerToClientEvents {
  "notification:new": (payload: unknown) => void;
  "emergency:alert": (payload: unknown) => void;
}

interface ClientToServerEvents {
  ping: (callback: () => void) => void;
}

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, { auth?: SocketAuth }>;

let io: AppServer | null = null;

export function initSocket(server: HttpServer, corsOrigin: string): AppServer {
  const instance: AppServer = new Server(server, {
    cors: { origin: corsOrigin, credentials: true },
    path: "/socket.io",
  });

  instance.use(async (socket, next) => {
    const raw = socket.handshake.auth?.token ?? socket.handshake.query?.token;
    const token = typeof raw === "string" ? raw : null;
    if (!token) {
      next(new Error("unauthorized"));
      return;
    }
    try {
      const auth = await verifyAccessToken(token);
      socket.data.auth = auth;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  instance.on("connection", (socket) => {
    const auth = socket.data.auth;
    if (!auth) {
      socket.disconnect(true);
      return;
    }
    socket.join(`user:${auth.sub}`);
    if (auth.cid) socket.join(`community:${auth.cid}`);

    socket.on("ping", (callback) => {
      if (typeof callback === "function") callback();
    });
  });

  io = instance;
  return instance;
}

export function emitToUser(userId: string, event: keyof ServerToClientEvents, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToCommunity(communityId: string, event: keyof ServerToClientEvents, payload: unknown): void {
  io?.to(`community:${communityId}`).emit(event, payload);
}

export function isSocketReady(): boolean {
  return io !== null;
}

export async function closeSocket(): Promise<void> {
  if (!io) return;
  await io.close();
  io = null;
}
