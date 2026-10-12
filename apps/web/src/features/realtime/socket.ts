import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "../../lib/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? undefined;

export type NotificationPayload = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationHandler = (payload: NotificationPayload) => void;

export type EmergencyPayload = {
  id: string;
  category: string;
  status: string;
  flatId: string | null;
  flatCode: string | null;
  at: string;
};

type EmergencyHandler = (payload: EmergencyPayload) => void;

let socket: Socket | null = null;
const handlers = new Set<NotificationHandler>();
const emergencyHandlers = new Set<EmergencyHandler>();

export function connectSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;
  if (socket?.connected) return socket;

  socket?.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token },
    path: "/socket.io",
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  socket.on("notification:new", (payload: NotificationPayload) => {
    handlers.forEach((handler) => handler(payload));
  });

  socket.on("emergency:alert", (payload: EmergencyPayload) => {
    emergencyHandlers.forEach((handler) => handler(payload));
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function onNotification(handler: NotificationHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function onEmergency(handler: EmergencyHandler): () => void {
  emergencyHandlers.add(handler);
  return () => {
    emergencyHandlers.delete(handler);
  };
}
