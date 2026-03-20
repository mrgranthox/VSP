process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import request from "supertest";

import { app } from "../../app";
import { sendOperationalAlert } from "../../lib/alerts";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const internalApiKey = process.env.INTERNAL_API_KEY ?? "test-internal-key";
const internalHeaders = {
  "x-internal-key": internalApiKey
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

  const alertResult = await sendOperationalAlert({
    severity: "warning",
    component: "itest_metrics_alert_disabled",
    summary: "intentional test alert"
  });

  assert.equal(alertResult.delivered, false);

  const metricsResponse = await api.get("/api/v1/internal/metrics").set("authorization", `Bearer ${internalApiKey}`);

  assert.equal(metricsResponse.status, 200);
  assert.equal((metricsResponse.headers["content-type"] as string).includes("text/plain"), true);
  assert.equal(metricsResponse.text.includes("vsp_http_requests_total"), true);
  assert.equal(metricsResponse.text.includes("vsp_app_readiness"), true);
  assert.equal(metricsResponse.text.includes("vsp_bullmq_queue_jobs"), true);
  assert.equal(metricsResponse.text.includes("vsp_dependency_checks_total"), true);
  assert.equal(metricsResponse.text.includes("vsp_dependency_check_duration_seconds"), true);
  assert.equal(metricsResponse.text.includes("vsp_operational_alerts_total"), true);
  assert.equal(
    metricsResponse.text.includes(
      'vsp_operational_alerts_total{component="itest_metrics_alert_disabled",severity="warning",result="disabled"} 1'
    ),
    true
  );
});

test("health route preserves request and trace context in headers and response meta", async () => {
  const requestId = "itest-request-id";
  const traceId = "0123456789abcdef0123456789abcdef";
  const traceparent = `00-${traceId}-0123456789abcdef-01`;

  const response = await api.get("/api/v1/health").set("x-request-id", requestId).set("traceparent", traceparent);

  assert.equal(response.status, 200);
  assert.equal(response.headers["x-request-id"], requestId);
  assert.equal(response.headers["x-trace-id"], traceId);
  assert.equal((response.headers.traceparent as string).startsWith(`00-${traceId}-`), true);
  assert.notEqual(response.headers.traceparent, traceparent);
  assert.equal(response.body.meta.requestId, requestId);
  assert.equal(response.body.meta.traceId, traceId);
});
