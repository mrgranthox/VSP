import { prisma } from "./prisma";
import { recordDependencyCheck } from "./metrics";
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

const durationSecondsSince = (startedAt: bigint): number => Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

const runApiReadinessChecks = async (): Promise<ApiReadinessResult> => {
  const checks: Record<string, boolean> = {
    database: false,
    redis: false
  };
  const errors: Record<string, string> = {};

  try {
    const startedAt = process.hrtime.bigint();
    await withTimeout("database", prisma.$queryRaw`SELECT 1`);
    checks.database = true;
    recordDependencyCheck({
      dependency: "database",
      result: "success",
      durationSeconds: durationSecondsSince(startedAt)
    });
  } catch (error) {
    recordDependencyCheck({
      dependency: "database",
      result: "failure",
      durationSeconds: 0
    });
    errors.database = error instanceof Error ? error.message : "database_unavailable";
  }

  try {
    const startedAt = process.hrtime.bigint();
    const pong = await withTimeout("redis", redis.ping());
    checks.redis = pong === "PONG";

    if (!checks.redis) {
      recordDependencyCheck({
        dependency: "redis",
        result: "failure",
        durationSeconds: durationSecondsSince(startedAt)
      });
      errors.redis = "redis_ping_failed";
    } else {
      recordDependencyCheck({
        dependency: "redis",
        result: "success",
        durationSeconds: durationSecondsSince(startedAt)
      });
    }
  } catch (error) {
    recordDependencyCheck({
      dependency: "redis",
      result: "failure",
      durationSeconds: 0
    });
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
