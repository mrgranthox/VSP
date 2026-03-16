import { randomUUID } from "node:crypto";

import { type NextFunction, type Request, type Response } from "express";

import { Errors } from "../lib/errors";
import { redis } from "../lib/redis";

const rateLimit =
  (key: (req: Request) => string, windowMs: number, max: number) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (process.env.RATE_LIMIT_ENABLED === "false") {
      next();
      return;
    }

    const redisKey = `rl:${key(req)}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    const member = `${now}:${randomUUID()}`;

    await redis.zremrangebyscore(redisKey, 0, windowStart);
    await redis.zadd(redisKey, now, member);
    const count = await redis.zcard(redisKey);
    await redis.pexpire(redisKey, windowMs);

    if (count > max) {
      const oldestEntry = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
      const oldestTimestamp = oldestEntry.length >= 2 ? Number.parseInt(oldestEntry[1] ?? "", 10) : now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

      res.setHeader("Retry-After", retryAfterSeconds);
      throw Errors.RATE_LIMIT_EXCEEDED();
    }

    next();
  };

export { rateLimit };
