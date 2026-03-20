process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { UserStatus, VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-users-${label}-${randomUUID()}@example.com`;
const buildSlug = (label: string): string => `itest-${label}-${randomUUID().slice(0, 8)}`;

const login = async (email: string, currentPassword = password) => {
  const response = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password: currentPassword
  });

  assert.equal(response.status, 200);
  return response.body.data.tokenPair.accessToken as string;
};

const cleanupUsersData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-users-"
      }
    }
  });

  await prisma.cityConfig.deleteMany({
    where: {
      slug: {
        startsWith: "itest-"
      }
    }
  });
};

before(async () => {
  await cleanupUsersData();
});

after(async () => {
  await cleanupUsersData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("users profile and preferences flow creates defaults, strips HTML, and returns safe public fields", async () => {
  const email = buildEmail("profile");
  const city = await prisma.cityConfig.create({
    data: {
      slug: buildSlug("city"),
      name: "Integration City",
      countryCode: "GH",
      currencyCode: "GHS",
      timezone: "Africa/Accra",
      defaultSearchRadiusKm: 25,
      isEnabled: true
    }
  });

  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName: "Profile",
    lastName: "Owner"
  });

  assert.equal(registerResponse.status, 201);
  const userId = registerResponse.body.data.userId as string;
  const accessToken = await login(email);

  const preferencesResponse = await api.get("/api/v1/users/me/preferences").set("Authorization", `Bearer ${accessToken}`);
  assert.equal(preferencesResponse.status, 200);
  assert.equal(preferencesResponse.body.data.chatPushEnabled, true);
  assert.equal(preferencesResponse.body.data.requestPushEnabled, true);
  assert.equal(preferencesResponse.body.data.marketingEmailEnabled, false);

  const updateMeResponse = await api.patch("/api/v1/users/me").set("Authorization", `Bearer ${accessToken}`).send({
    displayName: "Builder Pro",
    bio: "<b>Hello</b> <i>world</i>",
    cityId: city.id,
    lat: 5.6037,
    lng: -0.187
  });

  assert.equal(updateMeResponse.status, 200);
  assert.equal(updateMeResponse.body.data.displayName, "Builder Pro");
  assert.equal(updateMeResponse.body.data.bio, "Hello world");
  assert.equal(updateMeResponse.body.data.cityId, city.id);

  const meResponse = await api.get("/api/v1/users/me").set("Authorization", `Bearer ${accessToken}`);
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.data.user.id, userId);
  assert.equal(meResponse.body.data.displayName, "Builder Pro");

  const updatePreferencesResponse = await api.patch("/api/v1/users/me/preferences").set("Authorization", `Bearer ${accessToken}`).send({
    marketingEmailEnabled: true,
    quietHoursStart: 22,
    quietHoursEnd: 6
  });

  assert.equal(updatePreferencesResponse.status, 200);
  assert.equal(updatePreferencesResponse.body.data.marketingEmailEnabled, true);
  assert.equal(updatePreferencesResponse.body.data.quietHoursStart, 22);
  assert.equal(updatePreferencesResponse.body.data.quietHoursEnd, 6);

  const publicProfileResponse = await api.get(`/api/v1/users/${userId}/profile`);
  assert.equal(publicProfileResponse.status, 200);
  assert.equal(publicProfileResponse.body.data.userId, userId);
  assert.equal(publicProfileResponse.body.data.displayName, "Builder Pro");
  assert.equal(publicProfileResponse.body.data.cityId, city.id);
  assert.equal("lat" in publicProfileResponse.body.data, false);
  assert.equal("lng" in publicProfileResponse.body.data, false);
  assert.equal("email" in publicProfileResponse.body.data, false);
  assert.equal("phone" in publicProfileResponse.body.data, false);
});

test("users saved-workers, follows, and staged deletion flow works end to end", async () => {
  const email = buildEmail("actions");
  const workerEmail = buildEmail("worker");

  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName: "Action",
    lastName: "Owner"
  });

  assert.equal(registerResponse.status, 201);
  const accessToken = await login(email);

  const worker = await prisma.user.create({
    data: {
      email: workerEmail,
      passwordHash: "not-used-in-users-tests",
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: "Worker",
          lastName: "Approved"
        }
      },
      workerProfile: {
        create: {
          headline: "Approved worker",
          bio: "Ready to work",
          experienceYears: 5,
          verificationStatus: VerificationStatus.APPROVED
        }
      }
    },
    include: {
      workerProfile: true
    }
  });

  assert.ok(worker.workerProfile);

  const saveWorkerResponse = await api
    .post(`/api/v1/users/me/saved-workers/${worker.workerProfile.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({});

  assert.equal(saveWorkerResponse.status, 200);

  const savedWorkersResponse = await api
    .get("/api/v1/users/me/saved-workers?page=1&limit=20")
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(savedWorkersResponse.status, 200);
  assert.equal(savedWorkersResponse.body.data.length, 1);
  assert.equal(savedWorkersResponse.body.data[0].id, worker.workerProfile.id);

  const selfFollowResponse = await api.post("/api/v1/users/me/follows").set("Authorization", `Bearer ${accessToken}`).send({
    targetType: "USER",
    targetId: registerResponse.body.data.userId
  });

  assert.equal(selfFollowResponse.status, 403);
  assert.equal(selfFollowResponse.body.error.code, "PERMISSION_DENIED");

  const followUserResponse = await api.post("/api/v1/users/me/follows").set("Authorization", `Bearer ${accessToken}`).send({
    targetType: "USER",
    targetId: worker.id
  });

  assert.equal(followUserResponse.status, 200);

  const followWorkerResponse = await api.post("/api/v1/users/me/follows").set("Authorization", `Bearer ${accessToken}`).send({
    targetType: "WORKER",
    targetId: worker.workerProfile.id
  });

  assert.equal(followWorkerResponse.status, 200);

  const followsResponse = await api.get("/api/v1/users/me/follows?page=1&limit=20").set("Authorization", `Bearer ${accessToken}`);
  assert.equal(followsResponse.status, 200);
  assert.equal(followsResponse.body.data.length, 2);

  const followTargetType = "WORKER";

  const unfollowWorkerResponse = await api
    .delete(`/api/v1/users/me/follows/${followTargetType}/${worker.workerProfile.id}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(unfollowWorkerResponse.status, 200);

  const unsaveWorkerResponse = await api
    .delete(`/api/v1/users/me/saved-workers/${worker.workerProfile.id}`)
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(unsaveWorkerResponse.status, 200);

  const savedWorkersAfterDeleteResponse = await api
    .get("/api/v1/users/me/saved-workers?page=1&limit=20")
    .set("Authorization", `Bearer ${accessToken}`);

  assert.equal(savedWorkersAfterDeleteResponse.status, 200);
  assert.equal(savedWorkersAfterDeleteResponse.body.data.length, 0);

  const deleteMeResponse = await api.delete("/api/v1/users/me").set("Authorization", `Bearer ${accessToken}`);
  assert.equal(deleteMeResponse.status, 200);

  const meAfterDeleteResponse = await api.get("/api/v1/users/me").set("Authorization", `Bearer ${accessToken}`);
  assert.equal(meAfterDeleteResponse.status, 401);
  assert.equal(meAfterDeleteResponse.body.error.code, "AUTH_SESSION_EXPIRED");

  const loginAfterDeleteResponse = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(loginAfterDeleteResponse.status, 401);
  assert.equal(loginAfterDeleteResponse.body.error.code, "AUTH_INVALID_CREDENTIALS");
});
