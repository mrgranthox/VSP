process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const internalHeaders = {
  "x-internal-key": process.env.INTERNAL_API_KEY ?? "test-internal-key"
};

const cleanupAnalyticsData = async (): Promise<void> => {
  await prisma.analyticsEvent.deleteMany({
    where: {
      eventName: {
        startsWith: "itest.analytics."
      }
    }
  });
};

before(async () => {
  await cleanupAnalyticsData();
});

after(async () => {
  await cleanupAnalyticsData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("internal analytics flow covers ingestion and manual rollup job execution", async () => {
  const ingestResponse = await api.post("/api/v1/internal/analytics/events").set(internalHeaders).send({
    events: [
      {
        eventName: "itest.analytics.search",
        propsJson: {
          query: "electrician"
        }
      },
      {
        eventName: "itest.analytics.booking_view",
        propsJson: {
          bookingId: "00000000-0000-0000-0000-000000000001"
        }
      }
    ]
  });

  assert.equal(ingestResponse.status, 202);
  assert.equal(ingestResponse.body.data.accepted, 2);

  const rollupResponse = await api.post("/api/v1/internal/jobs/run").set(internalHeaders).send({
    jobName: "analytics_rollup",
    payload: {
      source: "itest"
    }
  });

  assert.equal(rollupResponse.status, 200);
  assert.equal(rollupResponse.body.data.result.events.length >= 1, true);

  const jobRun = await prisma.jobRun.findUnique({
    where: {
      id: rollupResponse.body.data.jobRunId as string
    }
  });

  assert.ok(jobRun);
});

test("internal metrics endpoint exposes readiness and request metrics", async () => {
  const healthResponse = await api.get("/api/v1/health");
  assert.equal(healthResponse.status, 200);

  const metricsResponse = await api.get("/api/v1/internal/metrics").set(internalHeaders);

  assert.equal(metricsResponse.status, 200);
  assert.equal((metricsResponse.headers["content-type"] as string).includes("text/plain"), true);
  assert.equal(metricsResponse.text.includes("vsp_http_requests_total"), true);
  assert.equal(metricsResponse.text.includes("vsp_app_readiness"), true);
  assert.equal(metricsResponse.text.includes("vsp_bullmq_queue_jobs"), true);
});
