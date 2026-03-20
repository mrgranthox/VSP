import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server as HttpServer } from "node:http";

import { type RawData, WebSocket, WebSocketServer } from "ws";
import { z, ZodError } from "zod";

import { ApiError, Errors } from "../lib/errors";
import { logger } from "../lib/logger";
import { recordWebsocketConnectionClosed, recordWebsocketConnectionOpened, recordWebsocketEvent } from "../lib/metrics";
import { prisma } from "../lib/prisma";
import { createRedisCacheConnection, redis } from "../lib/redis";
import { setSpanAttributes, SpanKind, withActiveSpan } from "../lib/tracing";
import { verifyAccessToken } from "../modules/auth/auth.tokens";
import { ChatService } from "../modules/chat/chat.service";
import type { ActorContext } from "../types/actor";
import { getGatewayChannel, publishConversationEvent, type GatewayEnvelope } from "./publisher";

const ClientEnvelopeSchema = z
  .object({
    event: z.string().min(1),
    payload: z.record(z.unknown()).default({})
  })
  .strict();

const ConversationJoinPayloadSchema = z
  .object({
    conversationId: z.string().uuid()
  })
  .strict();

const MessageSendPayloadSchema = z
  .object({
    clientMessageId: z.string().uuid(),
    conversationId: z.string().uuid(),
    messageType: z.enum(["TEXT", "IMAGE", "FILE", "SYSTEM"]),
    body: z.string().max(10_000).optional(),
    attachmentUploadRefs: z.array(z.string().min(1)).max(10).optional()
  })
  .strict();

const MessageReadPayloadSchema = z
  .object({
    conversationId: z.string().uuid(),
    messageId: z.string().uuid()
  })
  .strict();

const PingPayloadSchema = z.object({}).passthrough();

type ClientConnectionContext = {
  socketId: string;
  socket: WebSocket;
  actor: ActorContext;
  joinedConversationIds: Set<string>;
  isAlive: boolean;
  closed: boolean;
  heartbeatTimer: NodeJS.Timeout;
};

type WebsocketGatewayOptions = {
  path?: string;
};

const getGatewayPath = (): string => process.env.WS_GATEWAY_PATH ?? "/ws";
const getAuthTimeoutMs = (): number => Number.parseInt(process.env.WS_AUTH_TIMEOUT_MS ?? "10000", 10);
const getPresenceTtlSeconds = (): number => Number.parseInt(process.env.WS_PRESENCE_TTL_SECONDS ?? "45", 10);
const getMaxConnectionsPerUser = (): number => Number.parseInt(process.env.WS_MAX_CONNECTIONS_PER_USER ?? "5", 10);
const getHeartbeatIntervalMs = (): number => Number.parseInt(process.env.WS_HEARTBEAT_INTERVAL_MS ?? "30000", 10);
const getMaxPayloadBytes = (): number => Number.parseInt(process.env.WS_MAX_PAYLOAD_BYTES ?? "65536", 10);
const getMessageRateLimitMax = (): number => Number.parseInt(process.env.WS_MESSAGE_RATE_LIMIT_MAX ?? "30", 10);
const getMessageRateLimitWindowMs = (): number => Number.parseInt(process.env.WS_MESSAGE_RATE_LIMIT_WINDOW_MS ?? "60000", 10);

const getConnectionCountKey = (): string => "ws:connections:count";
const getPresenceKey = (userId: string): string => `presence:${userId}`;
const getUserConnectionsKey = (userId: string): string => `ws:connections:user:${userId}`;
const getMessageRateLimitKey = (userId: string, conversationId: string): string => `rl:wsmsg:${userId}:${conversationId}`;

const getRequestBaseUrl = (request: IncomingMessage): string => `http://${request.headers.host ?? "localhost"}`;

const serializeCloseReason = (message: string): Buffer => Buffer.from(message.slice(0, 120), "utf8");

const sendSocketEvent = (socket: WebSocket, event: string, payload: Record<string, unknown>): void => {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ event, payload }));
};

const sendSocketError = (socket: WebSocket, error: ApiError | Error): void => {
  const code = error instanceof ApiError ? error.code : "INTERNAL_SERVER_ERROR";
  const message = error instanceof ApiError ? error.message : "Unexpected websocket error";
  sendSocketEvent(socket, "error", { code, message });
};

const parseClientEnvelope = (raw: RawData) => {
  const normalized = typeof raw === "string" ? raw : raw.toString("utf8");
  return ClientEnvelopeSchema.parse(JSON.parse(normalized));
};

const buildValidationError = (error: ZodError) =>
  Errors.VALIDATION_FAILED(
    error.flatten().fieldErrors
  );

class WebsocketGateway {
  private readonly wss: WebSocketServer;
  private readonly chatService = new ChatService();
  private readonly subscriber = createRedisCacheConnection();
  private readonly socketsById = new Map<string, ClientConnectionContext>();
  private readonly socketIdsByUserId = new Map<string, Set<string>>();
  private readonly conversationSocketIds = new Map<string, Set<string>>();
  private readonly path: string;
  private readonly readyPromise: Promise<void>;

  constructor(private readonly server: HttpServer, options: WebsocketGatewayOptions = {}) {
    this.path = options.path ?? getGatewayPath();
    this.wss = new WebSocketServer({
      noServer: true,
      maxPayload: getMaxPayloadBytes()
    });
    this.readyPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    this.server.on("upgrade", this.handleUpgrade);
    this.wss.on("connection", (socket, request) => {
      void this.handleConnection(socket, request);
    });
    this.subscriber.on("message", (_channel, message) => {
      void this.handlePubSubMessage(message);
    });
    await this.subscriber.subscribe(getGatewayChannel());
  }

  private handleUpgrade = (request: IncomingMessage, socket: any, head: Buffer): void => {
    const url = new URL(request.url ?? "/", getRequestBaseUrl(request));

    if (url.pathname !== this.path) {
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(request, socket, head, (websocket) => {
      this.wss.emit("connection", websocket, request);
    });
  };

  private async authenticateRequest(request: IncomingMessage): Promise<ActorContext> {
    const url = new URL(request.url ?? "/", getRequestBaseUrl(request));
    const token = url.searchParams.get("token");

    if (!token) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const payload = verifyAccessToken(token);
    const session = await prisma.userSession.findUnique({
      where: {
        id: payload.jti
      },
      select: {
        userId: true,
        mfaVerified: true,
        expiresAt: true,
        revokedAt: true
      }
    });

    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    if (payload.status === "SUSPENDED") {
      throw Errors.USER_SUSPENDED();
    }

    return {
      userId: payload.sub,
      roles: payload.roles,
      mfaVerified: session.mfaVerified,
      sessionId: payload.jti,
      ipAddress: request.socket.remoteAddress ?? undefined
    };
  }

  private async enforceMaxConnections(userId: string, socketId: string): Promise<void> {
    const ttlSeconds = getPresenceTtlSeconds();
    const userConnectionsKey = getUserConnectionsKey(userId);

    await redis.sadd(userConnectionsKey, socketId);
    await redis.expire(userConnectionsKey, ttlSeconds);

    const connectionCount = await redis.scard(userConnectionsKey);

    if (connectionCount > getMaxConnectionsPerUser()) {
      await redis.srem(userConnectionsKey, socketId);
      throw new ApiError("WS_TOO_MANY_CONNECTIONS", 429, "Too many websocket connections");
    }
  }

  private async refreshPresence(context: ClientConnectionContext): Promise<void> {
    const ttlSeconds = getPresenceTtlSeconds();
    await Promise.all([
      redis.set(
        getPresenceKey(context.actor.userId),
        JSON.stringify({
          connectedAt: new Date().toISOString(),
          socketId: context.socketId
        }),
        "EX",
        ttlSeconds
      ),
      redis.expire(getUserConnectionsKey(context.actor.userId), ttlSeconds)
    ]);
  }

  private addSocket(context: ClientConnectionContext): void {
    this.socketsById.set(context.socketId, context);
    const socketIds = this.socketIdsByUserId.get(context.actor.userId) ?? new Set<string>();
    socketIds.add(context.socketId);
    this.socketIdsByUserId.set(context.actor.userId, socketIds);
  }

  private async removeSocket(context: ClientConnectionContext): Promise<void> {
    if (context.closed) {
      return;
    }

    context.closed = true;
    clearInterval(context.heartbeatTimer);
    const joinedConversationIds = [...context.joinedConversationIds];

    for (const conversationId of joinedConversationIds) {
      this.removeSocketFromConversation(context, conversationId);
    }

    this.socketsById.delete(context.socketId);
    const userSockets = this.socketIdsByUserId.get(context.actor.userId);

    if (userSockets) {
      userSockets.delete(context.socketId);

      if (userSockets.size === 0) {
        this.socketIdsByUserId.delete(context.actor.userId);
      }
    }

    const userConnectionsKey = getUserConnectionsKey(context.actor.userId);
    const remainingConnections = await redis.srem(userConnectionsKey, context.socketId).then(async () => redis.scard(userConnectionsKey));

    if (remainingConnections === 0) {
      await Promise.all([
        redis.del(userConnectionsKey),
        redis.del(getPresenceKey(context.actor.userId))
      ]);

      await Promise.all(
        joinedConversationIds.map((conversationId) =>
          publishConversationEvent(
            conversationId,
            "presence.offline",
            {
              userId: context.actor.userId
            },
            context.actor.userId
          )
        )
      );
    } else {
      await redis.expire(userConnectionsKey, getPresenceTtlSeconds());
    }

    const remainingGlobalCount = await redis.decr(getConnectionCountKey());
    recordWebsocketConnectionClosed();

    if (remainingGlobalCount < 0) {
      await redis.set(getConnectionCountKey(), "0");
    }
  }

  private addSocketToConversation(context: ClientConnectionContext, conversationId: string): void {
    if (context.joinedConversationIds.has(conversationId)) {
      return;
    }

    context.joinedConversationIds.add(conversationId);
    const socketIds = this.conversationSocketIds.get(conversationId) ?? new Set<string>();
    socketIds.add(context.socketId);
    this.conversationSocketIds.set(conversationId, socketIds);
  }

  private removeSocketFromConversation(context: ClientConnectionContext, conversationId: string): void {
    context.joinedConversationIds.delete(conversationId);
    const socketIds = this.conversationSocketIds.get(conversationId);

    if (!socketIds) {
      return;
    }

    socketIds.delete(context.socketId);

    if (socketIds.size === 0) {
      this.conversationSocketIds.delete(conversationId);
    }
  }

  private startHeartbeat(context: ClientConnectionContext): NodeJS.Timeout {
    return setInterval(() => {
      if (!context.isAlive) {
        context.socket.terminate();
        return;
      }

      context.isAlive = false;
      context.socket.ping();
    }, getHeartbeatIntervalMs());
  }

  private async ensureConversationAccess(context: ClientConnectionContext, conversationId: string, joinIfMissing = true): Promise<void> {
    if (context.joinedConversationIds.has(conversationId)) {
      return;
    }

    const isParticipant = await this.chatService.assertParticipant(context.actor.userId, conversationId);

    if (!isParticipant) {
      throw Errors.CONVERSATION_ACCESS_DENIED();
    }

    if (joinIfMissing) {
      this.addSocketToConversation(context, conversationId);
    }
  }

  private async isMessageRateLimited(userId: string, conversationId: string): Promise<boolean> {
    const now = Date.now();
    const windowMs = getMessageRateLimitWindowMs();
    const windowStart = now - windowMs;
    const member = `${now}:${randomUUID()}`;
    const redisKey = getMessageRateLimitKey(userId, conversationId);

    await redis.zremrangebyscore(redisKey, 0, windowStart);
    await redis.zadd(redisKey, now, member);
    const count = await redis.zcard(redisKey);
    await redis.pexpire(redisKey, windowMs);

    return count > getMessageRateLimitMax();
  }

  private async handleConversationJoin(context: ClientConnectionContext, payload: unknown): Promise<void> {
    const parsed = ConversationJoinPayloadSchema.parse(payload);
    const isParticipant = await this.chatService.assertParticipant(context.actor.userId, parsed.conversationId);

    if (!isParticipant) {
      throw Errors.CONVERSATION_ACCESS_DENIED();
    }

    this.addSocketToConversation(context, parsed.conversationId);
    await this.refreshPresence(context);
    await publishConversationEvent(
      parsed.conversationId,
      "presence.online",
      {
        userId: context.actor.userId
      },
      context.actor.userId
    );
  }

  private async handleConversationLeave(context: ClientConnectionContext, payload: unknown): Promise<void> {
    const parsed = ConversationJoinPayloadSchema.parse(payload);
    this.removeSocketFromConversation(context, parsed.conversationId);
    await this.refreshPresence(context);
  }

  private async handleMessageSend(context: ClientConnectionContext, payload: unknown): Promise<void> {
    const parsed = MessageSendPayloadSchema.parse(payload);
    await this.ensureConversationAccess(context, parsed.conversationId);

    if (await this.isMessageRateLimited(context.actor.userId, parsed.conversationId)) {
      throw Errors.RATE_LIMIT_EXCEEDED();
    }

    const message = await this.chatService.sendMessage(context.actor, parsed.conversationId, parsed);
    await publishConversationEvent(parsed.conversationId, "message.created", {
      messageId: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      messageType: message.messageType,
      body: message.body,
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : String(message.createdAt)
    });
  }

  private async handleMessageRead(context: ClientConnectionContext, payload: unknown): Promise<void> {
    const parsed = MessageReadPayloadSchema.parse(payload);
    await this.ensureConversationAccess(context, parsed.conversationId);
    await this.chatService.markRead(context.actor, parsed.conversationId, parsed.messageId);

    await publishConversationEvent(parsed.conversationId, "message.read", {
      conversationId: parsed.conversationId,
      messageId: parsed.messageId,
      readerUserId: context.actor.userId,
      readAt: new Date().toISOString()
    });
  }

  private async handleTypingEvent(context: ClientConnectionContext, payload: unknown, eventName: "typing.started" | "typing.stopped"): Promise<void> {
    const parsed = ConversationJoinPayloadSchema.parse(payload);
    await this.ensureConversationAccess(context, parsed.conversationId, false);

    await publishConversationEvent(
      parsed.conversationId,
      eventName,
      {
        conversationId: parsed.conversationId,
        userId: context.actor.userId
      },
      context.actor.userId
    );
  }

  private async handlePing(context: ClientConnectionContext, payload: unknown): Promise<void> {
    PingPayloadSchema.parse(payload);
    await this.refreshPresence(context);
    sendSocketEvent(context.socket, "pong", {});
  }

  private async handleClientEvent(context: ClientConnectionContext, raw: RawData): Promise<void> {
    let envelope: z.infer<typeof ClientEnvelopeSchema>;

    try {
      envelope = parseClientEnvelope(raw);
    } catch (error) {
      if (error instanceof ZodError) {
        throw buildValidationError(error);
      }

      throw Errors.VALIDATION_FAILED({
        message: ["Invalid JSON websocket payload"]
      });
    }

    await withActiveSpan(
      `ws.${envelope.event}`,
      {
        kind: SpanKind.CONSUMER
      },
      async (span) => {
        setSpanAttributes(span, {
          "vsp.ws.event": envelope.event,
          "vsp.ws.socket_id": context.socketId,
          "enduser.id": context.actor.userId
        });

        switch (envelope.event) {
          case "conversation.join":
            await this.handleConversationJoin(context, envelope.payload);
            return;
          case "conversation.leave":
            await this.handleConversationLeave(context, envelope.payload);
            return;
          case "message.send":
            await this.handleMessageSend(context, envelope.payload);
            return;
          case "message.read":
            await this.handleMessageRead(context, envelope.payload);
            return;
          case "typing.start":
            await this.handleTypingEvent(context, envelope.payload, "typing.started");
            return;
          case "typing.stop":
            await this.handleTypingEvent(context, envelope.payload, "typing.stopped");
            return;
          case "ping":
            await this.handlePing(context, envelope.payload);
            return;
          default:
            throw Errors.VALIDATION_FAILED({
              event: ["Unsupported websocket event"]
            });
        }
      }
    );
  }

  private async handleConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const authTimeout = setTimeout(() => {
      socket.close(4001, serializeCloseReason("Authentication required"));
    }, getAuthTimeoutMs());

    try {
      const actor = await this.authenticateRequest(request);
      const socketId = randomUUID();
      await this.enforceMaxConnections(actor.userId, socketId);

      const context: ClientConnectionContext = {
        socketId,
        socket,
        actor,
        joinedConversationIds: new Set<string>(),
        isAlive: true,
        closed: false,
        heartbeatTimer: undefined as unknown as NodeJS.Timeout
      };

      clearTimeout(authTimeout);
      context.heartbeatTimer = this.startHeartbeat(context);
      this.addSocket(context);
      await this.refreshPresence(context);
      await redis.incr(getConnectionCountKey());
      recordWebsocketConnectionOpened();

      socket.on("pong", () => {
        context.isAlive = true;
        void this.refreshPresence(context);
      });

      socket.on("message", (raw) => {
        context.isAlive = true;
        void this.handleClientEvent(context, raw).catch((error) => {
          recordWebsocketEvent("message", "error");
          sendSocketError(context.socket, error instanceof ApiError ? error : new Error("Websocket handler failed"));
        });
      });

      socket.on("close", () => {
        void this.removeSocket(context);
      });

      socket.on("error", (error) => {
        recordWebsocketEvent("connection", "error");
        logger.error({ error, userId: actor.userId, socketId }, "Websocket connection error");
      });

      sendSocketEvent(socket, "connected", {
        userId: actor.userId
      });
      recordWebsocketEvent("connection", "accepted");
    } catch (error) {
      clearTimeout(authTimeout);
      recordWebsocketEvent("connection", "rejected");
      socket.close(4001, serializeCloseReason("Invalid or expired token"));
    }
  }

  private async handlePubSubMessage(rawMessage: string): Promise<void> {
    let envelope: GatewayEnvelope;

    try {
      envelope = JSON.parse(rawMessage) as GatewayEnvelope;
    } catch {
      return;
    }

    await withActiveSpan(
      `ws.pubsub.${envelope.event}`,
      {
        kind: SpanKind.CONSUMER
      },
      async (span) => {
        setSpanAttributes(span, {
          "vsp.ws.scope": envelope.scope,
          "vsp.ws.event": envelope.event
        });

        if (envelope.scope === "user") {
          const socketIds = this.socketIdsByUserId.get(envelope.userId) ?? new Set<string>();

          for (const socketId of socketIds) {
            const context = this.socketsById.get(socketId);

            if (!context || envelope.excludeUserId === context.actor.userId) {
              continue;
            }

            sendSocketEvent(context.socket, envelope.event, envelope.payload);
          }

          return;
        }

        const socketIds = this.conversationSocketIds.get(envelope.conversationId) ?? new Set<string>();

        for (const socketId of socketIds) {
          const context = this.socketsById.get(socketId);

          if (!context || envelope.excludeUserId === context.actor.userId) {
            continue;
          }

          sendSocketEvent(context.socket, envelope.event, envelope.payload);
        }
      }
    );
  }

  async start(): Promise<void> {
    await this.readyPromise;
  }

  async close(): Promise<void> {
    this.server.off("upgrade", this.handleUpgrade);
    await this.subscriber.unsubscribe(getGatewayChannel());
    await this.subscriber.quit();

    for (const context of this.socketsById.values()) {
      clearInterval(context.heartbeatTimer);
      context.socket.close();
    }

    await new Promise<void>((resolve, reject) => {
      this.wss.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

export { WebsocketGateway };
