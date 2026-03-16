import { redis } from "../lib/redis";

type GatewayEnvelope =
  | {
      scope: "user";
      userId: string;
      event: string;
      payload: Record<string, unknown>;
      excludeUserId?: string | null;
      emittedAt: string;
    }
  | {
      scope: "conversation";
      conversationId: string;
      event: string;
      payload: Record<string, unknown>;
      excludeUserId?: string | null;
      emittedAt: string;
    };

const getGatewayChannel = (): string => process.env.WS_REDIS_CHANNEL ?? "ws:events";

const publishGatewayEnvelope = async (envelope: GatewayEnvelope): Promise<void> => {
  await redis.publish(getGatewayChannel(), JSON.stringify(envelope));
};

const publishUserEvent = async (
  userId: string,
  event: string,
  payload: Record<string, unknown>,
  excludeUserId?: string | null
): Promise<void> =>
  publishGatewayEnvelope({
    scope: "user",
    userId,
    event,
    payload,
    excludeUserId,
    emittedAt: new Date().toISOString()
  });

const publishConversationEvent = async (
  conversationId: string,
  event: string,
  payload: Record<string, unknown>,
  excludeUserId?: string | null
): Promise<void> =>
  publishGatewayEnvelope({
    scope: "conversation",
    conversationId,
    event,
    payload,
    excludeUserId,
    emittedAt: new Date().toISOString()
  });

const isUserOnline = async (userId: string): Promise<boolean> => Boolean(await redis.get(`presence:${userId}`));

const publishUserEventIfOnline = async (
  userId: string,
  event: string,
  payload: Record<string, unknown>,
  excludeUserId?: string | null
): Promise<boolean> => {
  if (!(await isUserOnline(userId))) {
    return false;
  }

  await publishUserEvent(userId, event, payload, excludeUserId);
  return true;
};

export { getGatewayChannel, isUserOnline, publishConversationEvent, publishGatewayEnvelope, publishUserEvent, publishUserEventIfOnline };
export type { GatewayEnvelope };
