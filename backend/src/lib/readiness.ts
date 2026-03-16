import { prisma } from "./prisma";
import { redis } from "./redis";

const healthCheckTimeoutMs = 2_000;

interface ApiReadinessResult {
  ready: boolean;
  checks: Record<string, boolean>;
  errors: Record<string, string>;
}

const withTimeout = async <T>(label: string, promise: Promise<T>): Promise<T> =>
  await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label}_timeout`));
      }, healthCheckTimeoutMs);
    })
  ]);

const runApiReadinessChecks = async (): Promise<ApiReadinessResult> => {
  const checks: Record<string, boolean> = {
    database: false,
    redis: false
  };
  const errors: Record<string, string> = {};

  try {
    await withTimeout("database", prisma.$queryRaw`SELECT 1`);
    checks.database = true;
  } catch (error) {
    errors.database = error instanceof Error ? error.message : "database_unavailable";
  }

  try {
    const pong = await withTimeout("redis", redis.ping());
    checks.redis = pong === "PONG";

    if (!checks.redis) {
      errors.redis = "redis_ping_failed";
    }
  } catch (error) {
    errors.redis = error instanceof Error ? error.message : "redis_unavailable";
  }

  return {
    ready: Object.values(checks).every(Boolean),
    checks,
    errors
  };
};

export { runApiReadinessChecks };
export type { ApiReadinessResult };
