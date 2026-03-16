process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { after, before, test } from "node:test";

import request from "supertest";

import { app } from "../app";
import { prisma } from "../lib/prisma";
import { redis, redisQueue } from "../lib/redis";
import { enqueueNamedJobAndWait } from "../queues";
import { startBackgroundWorkers, stopBackgroundWorkers } from ".";

const api = request(app);
const password = "Change-This-Password-123!";
const previousEventBusMode = process.env.EVENT_BUS_MODE;

const buildEmail = (label: string): string => `itest-workers-${label}-${randomUUID()}@example.com`;

const cleanupWorkersData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-workers-"
      }
    }
  });
};

const waitFor = async (assertion: () => Promise<void>, timeoutMs = 5_000): Promise<void> => {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await sleep(100);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Timed out waiting for background job result");
};

before(async () => {
  process.env.EVENT_BUS_MODE = "queue";
  await cleanupWorkersData();
  await startBackgroundWorkers({ registerSchedulers: false });
});

after(async () => {
  process.env.EVENT_BUS_MODE = previousEventBusMode;
  await stopBackgroundWorkers();
  await cleanupWorkersData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("queue-mode USER_REGISTERED event creates notification preferences and analytics job ledger entries", async () => {
  const email = buildEmail("register");
  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName: "Queue",
    lastName: "Worker"
  });

  assert.equal(registerResponse.status, 201);

  const userId = registerResponse.body.data.userId as string;

  await waitFor(async () => {
    const [preference, analyticsEvent, jobRuns] = await Promise.all([
      prisma.notificationPreference.findUnique({
        where: {
          userId
        }
      }),
      prisma.analyticsEvent.findFirst({
        where: {
          eventName: "USER_REGISTERED",
          entityType: "domain_event"
        },
        orderBy: {
          id: "desc"
        }
      }),
      prisma.jobRun.findMany({
        where: {
          jobName: "USER_REGISTERED"
        }
      })
    ]);

    assert.ok(preference);
    assert.ok(analyticsEvent);
    assert.equal(jobRuns.length >= 2, true);
    assert.equal(jobRuns.every((jobRun) => jobRun.status === "SUCCEEDED"), true);
  });
});

test("token_cleanup queue job deletes stale sessions, push tokens, and idempotency keys", async () => {
  const email = buildEmail("cleanup");
  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName: "Cleanup",
    lastName: "Worker"
  });

  assert.equal(registerResponse.status, 201);
  const userId = registerResponse.body.data.userId as string;

  await prisma.userSession.create({
    data: {
      userId,
      refreshTokenHash: randomUUID(),
      expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  });
  await prisma.pushDevice.create({
    data: {
      userId,
      deviceToken: `token-${randomUUID()}`,
      platform: "ios",
      lastSeenAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    }
  });
  await prisma.apiIdempotencyKey.create({
    data: {
      idempotencyKey: `itest-workers-cleanup-${randomUUID()}`,
      userId,
      requestHash: randomUUID(),
      expiresAt: new Date(Date.now() - 60 * 60 * 1000)
    }
  });

  const jobResult = (await enqueueNamedJobAndWait("token_cleanup", {})) as {
    jobRunId: string;
    result: {
      deletedSessions: number;
      deletedPushDevices: number;
      deletedIdempotencyKeys: number;
    };
  };

  assert.equal(jobResult.result.deletedSessions >= 1, true);
  assert.equal(jobResult.result.deletedPushDevices >= 1, true);
  assert.equal(jobResult.result.deletedIdempotencyKeys >= 1, true);

  const [sessions, pushDevices, idempotencyKeys, jobRun] = await Promise.all([
    prisma.userSession.count({
      where: {
        userId,
        expiresAt: {
          lt: new Date()
        }
      }
    }),
    prisma.pushDevice.count({
      where: {
        userId
      }
    }),
    prisma.apiIdempotencyKey.count({
      where: {
        userId
      }
    }),
    prisma.jobRun.findUnique({
      where: {
        id: jobResult.jobRunId
      }
    })
  ]);

  assert.equal(sessions, 0);
  assert.equal(pushDevices, 0);
  assert.equal(idempotencyKeys, 0);
  assert.ok(jobRun);
  assert.equal(jobRun.status, "SUCCEEDED");
});
