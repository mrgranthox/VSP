process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";
const moderationCaseIdsToCleanup = new Set<string>();

const buildEmail = (label: string): string => `itest-moderation-${label}-${randomUUID()}@example.com`;

const cleanupModerationData = async (): Promise<void> => {
  await prisma.fraudSignal.deleteMany({
    where: {
      user: {
        email: {
          startsWith: "itest-moderation-"
        }
      }
    }
  });

  if (moderationCaseIdsToCleanup.size > 0) {
    await prisma.moderationCase.deleteMany({
      where: {
        id: {
          in: Array.from(moderationCaseIdsToCleanup)
        }
      }
    });
    moderationCaseIdsToCleanup.clear();
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-moderation-"
      }
    }
  });
};

before(async () => {
  await cleanupModerationData();
});

after(async () => {
  await cleanupModerationData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("moderation events persist refresh-token fraud signals and open a case above threshold", async () => {
  const startedAt = new Date();
  const email = buildEmail("fraud");

  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName: "Fraud",
    lastName: "Signal"
  });

  assert.equal(registerResponse.status, 201);
  const userId = registerResponse.body.data.userId as string;

  const loginResponse = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(loginResponse.status, 200);
  const originalRefreshToken = loginResponse.body.data.tokenPair.refreshToken as string;

  const refreshResponse = await api.post("/api/v1/auth/refresh").send({
    refreshToken: originalRefreshToken
  });

  assert.equal(refreshResponse.status, 200);

  const reuseResponse = await api.post("/api/v1/auth/refresh").send({
    refreshToken: originalRefreshToken
  });

  assert.equal(reuseResponse.status, 401);
  assert.equal(reuseResponse.body.error.code, "AUTH_SESSION_EXPIRED");

  const [fraudSignals, moderationCases] = await Promise.all([
    prisma.fraudSignal.findMany({
      where: {
        userId,
        signalKey: "REFRESH_TOKEN_REUSE"
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.moderationCase.findMany({
      where: {
        reportId: null,
        createdAt: {
          gte: startedAt
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    })
  ]);

  assert.ok(fraudSignals.length >= 1);
  assert.equal(Number(fraudSignals[0].score), 80);
  assert.ok(moderationCases.length >= 1);

  for (const moderationCase of moderationCases) {
    moderationCaseIdsToCleanup.add(moderationCase.id);
  }
});
