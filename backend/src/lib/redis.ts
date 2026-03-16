import Redis, { type RedisOptions } from "ioredis";

const buildRedisOptions = (db: number, maxRetriesPerRequest: number | null): RedisOptions => {
  const url = new URL(process.env.REDIS_URL!);

  return {
    host: url.hostname,
    port: Number.parseInt(url.port || "6379", 10),
    username: url.username || undefined,
    password: process.env.REDIS_PASSWORD || url.password || undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    db,
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? "vsp:",
    enableReadyCheck: true,
    maxRetriesPerRequest
  };
};

const buildBullMqConnectionOptions = (db: number): RedisOptions => ({
  ...buildRedisOptions(db, null),
  keyPrefix: undefined,
  enableReadyCheck: false
});

const createRedisCacheConnection = (): Redis =>
  new Redis(process.env.REDIS_URL!, buildRedisOptions(Number.parseInt(process.env.REDIS_CACHE_DB ?? "0", 10), 3));

const createRedisQueueConnection = (): Redis =>
  new Redis(process.env.REDIS_URL!, buildRedisOptions(Number.parseInt(process.env.REDIS_QUEUE_DB ?? "1", 10), null));

const getBullMqConnectionOptions = (): RedisOptions =>
  buildBullMqConnectionOptions(Number.parseInt(process.env.REDIS_QUEUE_DB ?? "1", 10));

const getBullMqPrefix = (): string => (process.env.REDIS_KEY_PREFIX ?? "vsp:").replace(/:+$/, "");

const redis = createRedisCacheConnection();
const redisQueue = createRedisQueueConnection();

export { createRedisCacheConnection, createRedisQueueConnection, getBullMqConnectionOptions, getBullMqPrefix, redis, redisQueue };
