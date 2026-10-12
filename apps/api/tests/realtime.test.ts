import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { io as ioClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { closeSocket, initSocket } from "../src/realtime/socket.js";
import { createActor, createCommunity, type TestActor } from "./helpers.js";

const app = createApp();

let httpServer: HttpServer;
let baseUrl: string;
let admin: TestActor;
let resident: TestActor;

beforeAll(async () => {
  const community = await createCommunity("Realtime Community");
  admin = await createActor({ role: "COMMUNITY_ADMIN", communityId: community.id });
  resident = await createActor({ role: "RESIDENT", communityId: community.id });

  httpServer = createServer(app);
  initSocket(httpServer, "*");
  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  await closeSocket();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await prisma.$disconnect();
});

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(baseUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });
    client.on("connect", () => resolve(client));
    client.on("connect_error", (error) => reject(error));
    setTimeout(() => reject(new Error("socket connect timeout")), 5000);
  });
}

describe("realtime notifications", () => {
  it("rejects a connection without a valid token", async () => {
    await expect(connect("not-a-real-token")).rejects.toThrow();
  });

  it("pushes notification:new to the recipient in real time", async () => {
    const client = await connect(resident.accessToken);
    const received = new Promise<{ title: string }>((resolve) => {
      client.on("notification:new", resolve);
    });

    const response = await request(app)
      .post("/api/v1/notifications/send")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ userId: resident.id, type: "GENERAL", title: "Realtime hello", body: "Hey there" });

    expect(response.status).toBe(200);
    const payload = await received;
    expect(payload.title).toBe("Realtime hello");
    client.close();
  });
});
