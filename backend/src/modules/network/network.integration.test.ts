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

const buildEmail = (label: string): string => `itest-net-${label}-${randomUUID()}@example.com`;

const login = async (email: string): Promise<string> => {
  const response = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(response.status, 200);
  return response.body.data.tokenPair.accessToken as string;
};

const createUserAndLogin = async (label: string, firstName = "Net", lastName = "User") => {
  const email = buildEmail(label);

  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName,
    lastName
  });

  assert.equal(registerResponse.status, 201);

  return {
    email,
    userId: registerResponse.body.data.userId as string,
    accessToken: await login(email)
  };
};

test("network stats, connection degree, and pymk work end to end", async () => {
  const userA = await createUserAndLogin("usera", "Kwame", "Appiah");
  const userB = await createUserAndLogin("userb", "Ama", "Mensah");

  // 1. Check stats
  const statsRes = await api
    .get("/api/v1/network/stats")
    .set("Authorization", `Bearer ${userA.accessToken}`);
  assert.equal(statsRes.status, 200);
  assert.equal(typeof statsRes.body.data.connectionsCount, "number");

  // 2. Initial connection degree between A and B should be 3
  const degreeRes1 = await api
    .get(`/api/v1/network/connections/degree/${userB.userId}`)
    .set("Authorization", `Bearer ${userA.accessToken}`);
  assert.equal(degreeRes1.status, 200);
  assert.equal(degreeRes1.body.data.degree, 3);
  assert.equal(degreeRes1.body.data.isConnected, false);

  // 3. User A connects to User B
  const connectRes = await api
    .post(`/api/v1/network/connect/${userB.userId}`)
    .set("Authorization", `Bearer ${userA.accessToken}`)
    .send({ note: "Let's connect on VSP" });
  assert.equal(connectRes.status, 200);
  assert.equal(connectRes.body.data.connected, true);

  // 4. Degree should now be 2 (one-way follow)
  const degreeRes2 = await api
    .get(`/api/v1/network/connections/degree/${userB.userId}`)
    .set("Authorization", `Bearer ${userA.accessToken}`);
  assert.equal(degreeRes2.status, 200);
  assert.equal(degreeRes2.body.data.degree, 2);

  // 5. User B connects back to User A -> 1st degree mutual connection!
  await api
    .post(`/api/v1/network/connect/${userA.userId}`)
    .set("Authorization", `Bearer ${userB.accessToken}`)
    .send({});

  const degreeRes3 = await api
    .get(`/api/v1/network/connections/degree/${userB.userId}`)
    .set("Authorization", `Bearer ${userA.accessToken}`);
  assert.equal(degreeRes3.status, 200);
  assert.equal(degreeRes3.body.data.degree, 1);
  assert.equal(degreeRes3.body.data.isConnected, true);

  // 6. PYMK endpoint
  const pymkRes = await api
    .get("/api/v1/network/pymk")
    .set("Authorization", `Bearer ${userA.accessToken}`);
  assert.equal(pymkRes.status, 200);
  assert.ok(Array.isArray(pymkRes.body.data));

  // 7. Cleanup
  await prisma.user.deleteMany({
    where: {
      email: { in: [userA.email, userB.email] }
    }
  });
});

after(async () => {
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});
