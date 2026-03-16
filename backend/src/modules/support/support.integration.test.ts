process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { SupportTicketStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-support-${label}-${randomUUID()}@example.com`;

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
    accessToken: loginResponse.body.data.tokenPair.accessToken as string
  };
};

const cleanupSupportData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-support-"
      }
    }
  });
};

before(async () => {
  await cleanupSupportData();
});

after(async () => {
  await cleanupSupportData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("support flow covers ticket create, list/detail, message add, and status updates", async () => {
  const actor = await registerAndLogin("customer", "Support", "Customer");

  const createResponse = await api
    .post("/api/v1/support/tickets")
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      subject: "<b>Need account help</b>",
      body: "<p>My request details are wrong and I need support assistance.</p>",
      priority: "HIGH",
      relatedEntityType: "user"
    });

  assert.equal(createResponse.status, 201);
  const ticketId = createResponse.body.data.id as string;
  assert.equal(createResponse.body.data.subject, "Need account help");

  const listResponse = await api.get("/api/v1/support/tickets?page=1&limit=20").set("Authorization", `Bearer ${actor.accessToken}`);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.pagination.total, 1);

  const detailResponse = await api
    .get(`/api/v1/support/tickets/${ticketId}`)
    .set("Authorization", `Bearer ${actor.accessToken}`);

  assert.equal(detailResponse.status, 200);
  assert.equal(detailResponse.body.data.messages.length, 1);

  const messageResponse = await api
    .post(`/api/v1/support/tickets/${ticketId}/messages`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      body: "<i>Please update me when this is fixed</i>"
    });

  assert.equal(messageResponse.status, 201);

  const resolveResponse = await api
    .patch(`/api/v1/support/tickets/${ticketId}`)
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      status: "RESOLVED"
    });

  assert.equal(resolveResponse.status, 200);
  assert.equal(resolveResponse.body.data.status, SupportTicketStatus.RESOLVED);
});
