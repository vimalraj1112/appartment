import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { closeSocket, initSocket } from "./realtime/socket.js";

const app = createApp();
const server = createServer(app);

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;

initSocket(server, env.CORS_ORIGIN);

server.listen(env.PORT, () => {
  console.info(`SuperLink API listening on http://localhost:${env.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Received ${signal}, shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out, forcing exit.");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await closeSocket();
      await prisma.$disconnect();
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  void shutdown("uncaughtException");
});
