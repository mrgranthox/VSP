process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { InvoiceStatus, PaymentIntentStatus, SubscriptionStatus, VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-billing-${label}-${randomUUID()}@example.com`;

const registerAndLogin = async (label: string, firstName: string, lastName: string) => {
  const email = buildEmail(label);
  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName,
    lastName
  });

  assert.equal(registerResponse.status, 201);

  const loginResponse = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(loginResponse.status, 200);

  return {
    userId: registerResponse.body.data.userId as string,
    accessToken: loginResponse.body.data.tokenPair.accessToken as string
  };
};

const cleanupBillingData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-billing-"
      }
    }
  });
};

before(async () => {
  await cleanupBillingData();
});

after(async () => {
  await cleanupBillingData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("billing flow covers payment intent creation, confirmation, provider webhook success, and invoice/subscription reads", async () => {
  const worker = await registerAndLogin("worker", "Billing", "Worker");

  await prisma.workerProfile.create({
    data: {
      userId: worker.userId,
      headline: "Featured electrician",
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  const createResponse = await api
    .post("/api/v1/billing/payment-intents")
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({
      type: "FEATURED_SUBSCRIPTION",
      durationDays: 14
    });

  assert.equal(createResponse.status, 201);
  const paymentIntentId = createResponse.body.data.id as string;
  assert.equal(createResponse.body.data.status, PaymentIntentStatus.CREATED);

  const getResponse = await api
    .get(`/api/v1/billing/payment-intents/${paymentIntentId}`)
    .set("Authorization", `Bearer ${worker.accessToken}`);

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.data.id, paymentIntentId);

  const confirmResponse = await api
    .post(`/api/v1/billing/payment-intents/${paymentIntentId}/confirm`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({
      providerRef: "itest-billing-provider-ref"
    });

  assert.equal(confirmResponse.status, 200);
  assert.equal(confirmResponse.body.data.status, PaymentIntentStatus.PENDING);

  const webhookResponse = await api
    .post("/api/v1/billing/webhooks/provider?provider=mock")
    .set("Content-Type", "application/json")
    .send({
      id: randomUUID(),
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "itest-billing-provider-ref",
          providerRef: "itest-billing-provider-ref",
          metadata: {
            paymentIntentId
          }
        }
      }
    });

  assert.equal(webhookResponse.status, 200);

  const subscriptionResponse = await api
    .get("/api/v1/billing/subscriptions/me")
    .set("Authorization", `Bearer ${worker.accessToken}`);

  assert.equal(subscriptionResponse.status, 200);
  assert.equal(subscriptionResponse.body.data.isActive, true);
  assert.equal(subscriptionResponse.body.data.subscription.status, SubscriptionStatus.ACTIVE);

  const invoicesResponse = await api
    .get("/api/v1/billing/invoices/me?page=1&limit=20")
    .set("Authorization", `Bearer ${worker.accessToken}`);

  assert.equal(invoicesResponse.status, 200);
  assert.equal(invoicesResponse.body.pagination.total, 1);
  assert.equal(invoicesResponse.body.data[0].status, InvoiceStatus.PAID);

  const paymentIntent = await prisma.paymentIntent.findUnique({
    where: { id: paymentIntentId }
  });
  assert.equal(paymentIntent?.status, PaymentIntentStatus.SUCCEEDED);
});
