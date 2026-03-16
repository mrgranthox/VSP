process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type Server as HttpServer } from "node:http";
import { after, before, test } from "node:test";

import WebSocket from "ws";
import request from "supertest";

import { app } from "../app";
import { prisma } from "../lib/prisma";
import { redis, redisQueue } from "../lib/redis";
import { NotificationsService } from "../modules/notifications/notifications.service";
import { WebsocketGateway } from "./websocket";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-ws-${label}-${randomUUID()}@example.com`;

class SocketHarness {
  readonly socket: WebSocket;
  private readonly queue: Array<{ event: string; payload: Record<string, unknown> }> = [];
  private readonly waiters = new Map<string, Array<(value: Record<string, unknown>) => void>>();

  constructor(url: string) {
    this.socket = new WebSocket(url);
    this.socket.on("message", (raw) => {
      const parsed = JSON.parse(raw.toString("utf8")) as { event: string; payload: Record<string, unknown> };
      const pending = this.waiters.get(parsed.event)?.shift();

      if (pending) {
        pending(parsed.payload);
        return;
      }

      this.queue.push(parsed);
    });
  }

  waitForOpen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.once("open", () => resolve());
      this.socket.once("error", reject);
    });
  }

  waitForClose(): Promise<{ code: number; reason: string }> {
    return new Promise((resolve) => {
      this.socket.once("close", (code, reason) => {
        resolve({
          code,
          reason: reason.toString("utf8")
        });
      });
    });
  }

  async nextEvent(event: string): Promise<Record<string, unknown>> {
    const queuedIndex = this.queue.findIndex((entry) => entry.event === event);

    if (queuedIndex >= 0) {
      const [queued] = this.queue.splice(queuedIndex, 1);
      return queued.payload;
    }

    return new Promise((resolve) => {
      const waiters = this.waiters.get(event) ?? [];
      waiters.push(resolve);
      this.waiters.set(event, waiters);
    });
  }

  async nextEventWhere(event: string, predicate: (payload: Record<string, unknown>) => boolean): Promise<Record<string, unknown>> {
    while (true) {
      const payload = await this.nextEvent(event);

      if (predicate(payload)) {
        return payload;
      }
    }
  }

  send(event: string, payload: Record<string, unknown>): void {
    this.socket.send(JSON.stringify({ event, payload }));
  }

  close(): void {
    this.socket.close();
  }
}

let server: HttpServer;
let gateway: WebsocketGateway;
let websocketBaseUrl: string;

const cleanupGatewayData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-ws-"
      }
    }
  });
};

const registerAndLogin = async (label: string, firstName: string, lastName: string) => {
  const email = buildEmail(label);
  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName,
    lastName
  });

  assert.equal(registerResponse.status, 201);

  const loginResponse = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(loginResponse.status, 200);

  return {
    userId: registerResponse.body.data.userId as string,
    accessToken: loginResponse.body.data.tokenPair.accessToken as string
  };
};

before(async () => {
  await cleanupGatewayData();
  server = createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });
  gateway = new WebsocketGateway(server, { path: "/ws" });
  await gateway.start();
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to start websocket test server");
  }

  websocketBaseUrl = `ws://127.0.0.1:${address.port}/ws`;
});

after(async () => {
  await gateway.close();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
  await cleanupGatewayData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("websocket gateway rejects invalid connections with close code 4001", async () => {
  const socket = new SocketHarness(`${websocketBaseUrl}?token=invalid-token`);
  const closed = await socket.waitForClose();

  assert.equal(closed.code, 4001);
});

test("websocket gateway covers connect, join, typing, messaging, read receipts, presence, and notification delivery", async () => {
  const actor = await registerAndLogin("actor", "Socket", "Actor");
  const peer = await registerAndLogin("peer", "Socket", "Peer");
  const createConversationResponse = await api.post("/api/v1/conversations").set("Authorization", `Bearer ${actor.accessToken}`).send({
    type: "DIRECT",
    participantIds: [peer.userId]
  });

  assert.equal(createConversationResponse.status, 201);
  const conversationId = createConversationResponse.body.data.id as string;

  const actorSocket = new SocketHarness(`${websocketBaseUrl}?token=${actor.accessToken}`);
  const peerSocket = new SocketHarness(`${websocketBaseUrl}?token=${peer.accessToken}`);

  await Promise.all([actorSocket.waitForOpen(), peerSocket.waitForOpen()]);
  assert.equal((await actorSocket.nextEvent("connected")).userId, actor.userId);
  assert.equal((await peerSocket.nextEvent("connected")).userId, peer.userId);

  actorSocket.send("conversation.join", { conversationId });
  peerSocket.send("conversation.join", { conversationId });

  const actorPresenceOnline = await actorSocket.nextEvent("presence.online");
  assert.equal(actorPresenceOnline.userId, peer.userId);

  peerSocket.send("typing.start", { conversationId });
  const typingStarted = await actorSocket.nextEvent("typing.started");
  assert.equal(typingStarted.userId, peer.userId);

  peerSocket.send("typing.stop", { conversationId });
  const typingStopped = await actorSocket.nextEvent("typing.stopped");
  assert.equal(typingStopped.userId, peer.userId);

  const clientMessageId = randomUUID();
  actorSocket.send("message.send", {
    clientMessageId,
    conversationId,
    messageType: "TEXT",
    body: "Hello from websocket"
  });

  const [actorMessage, peerMessage] = await Promise.all([
    actorSocket.nextEvent("message.created"),
    peerSocket.nextEvent("message.created")
  ]);

  assert.equal(actorMessage.conversationId, conversationId);
  assert.equal(peerMessage.messageId, actorMessage.messageId);
  assert.equal(actorMessage.body, "Hello from websocket");

  peerSocket.send("message.read", {
    conversationId,
    messageId: actorMessage.messageId as string
  });

  const readReceipt = await actorSocket.nextEvent("message.read");
  assert.equal(readReceipt.readerUserId, peer.userId);
  assert.equal(readReceipt.messageId, actorMessage.messageId);

  await new NotificationsService().createInAppNotification(peer.userId, "TEST_NOTIFICATION", {
    source: "websocket-test"
  });
  const notificationCreated = await peerSocket.nextEventWhere(
    "notification.created",
    (payload) => payload.notificationType === "TEST_NOTIFICATION"
  );
  assert.equal(notificationCreated.notificationType, "TEST_NOTIFICATION");
  assert.equal((notificationCreated.payloadJson as { source: string }).source, "websocket-test");

  const offlineEventPromise = actorSocket.nextEvent("presence.offline");
  peerSocket.close();
  const presenceOffline = await offlineEventPromise;
  assert.equal(presenceOffline.userId, peer.userId);

  actorSocket.close();
});
