process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { AssignmentStatus, RequestStatus, VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-requests-${label}-${randomUUID()}@example.com`;
const buildSlug = (label: string): string => `itest-requests-${label}-${randomUUID().slice(0, 8)}`;

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
    email,
    userId: registerResponse.body.data.userId as string,
    accessToken: loginResponse.body.data.tokenPair.accessToken as string
  };
};

const cleanupRequestsData = async (): Promise<void> => {
  await prisma.apiIdempotencyKey.deleteMany({
    where: {
      idempotencyKey: {
        startsWith: "itest-requests-"
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-requests-"
      }
    }
  });

  await prisma.tradeCategory.deleteMany({
    where: {
      slug: {
        startsWith: "itest-requests-"
      }
    }
  });
};

before(async () => {
  await cleanupRequestsData();
});

after(async () => {
  await cleanupRequestsData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("service requests cover idempotent create, assignment acceptance, list/detail access, and status history", async () => {
  const customer = await registerAndLogin("customer", "Request", "Customer");
  const workerOne = await registerAndLogin("worker-one", "First", "Worker");
  const workerTwo = await registerAndLogin("worker-two", "Second", "Worker");
  const outsider = await registerAndLogin("outsider", "Outside", "Viewer");

  const [tradeCategory, workerProfileOne, workerProfileTwo] = await Promise.all([
    prisma.tradeCategory.create({
      data: {
        slug: buildSlug("trade"),
        name: "Electrical"
      }
    }),
    prisma.workerProfile.create({
      data: {
        userId: workerOne.userId,
        headline: "Approved Worker One",
        verificationStatus: VerificationStatus.APPROVED
      }
    }),
    prisma.workerProfile.create({
      data: {
        userId: workerTwo.userId,
        headline: "Approved Worker Two",
        verificationStatus: VerificationStatus.APPROVED
      }
    })
  ]);

  const createBody = {
    tradeCategoryId: tradeCategory.id,
    title: "<b>Repair kitchen wiring</b>",
    description: "<p>Need urgent rewiring for the kitchen lights and sockets.</p>",
    locationText: "<i>East Legon</i>",
    lat: 5.634,
    lng: -0.148,
    items: [
      { label: "<b>Light switches</b>", quantity: 2, note: "<script>ignore</script>Replace faulty units" }
    ]
  };

  const idempotencyKey = `itest-requests-${randomUUID()}`;

  const createResponse = await api
    .post("/api/v1/service-requests")
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .set("X-Idempotency-Key", idempotencyKey)
    .send(createBody);

  assert.equal(createResponse.status, 201);
  const requestId = createResponse.body.data.id as string;
  assert.equal(createResponse.body.data.title, "Repair kitchen wiring");
  assert.equal(createResponse.body.data.description, "Need urgent rewiring for the kitchen lights and sockets.");
  assert.equal(createResponse.body.data.items[0].label, "Light switches");
  assert.equal(createResponse.body.data.items[0].note, "ignore Replace faulty units");
  assert.equal(createResponse.body.data.status, RequestStatus.OPEN);

  const replayResponse = await api
    .post("/api/v1/service-requests")
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .set("X-Idempotency-Key", idempotencyKey)
    .send(createBody);

  assert.equal(replayResponse.status, 201);
  assert.equal(replayResponse.body.data.id, requestId);

  const conflictResponse = await api
    .post("/api/v1/service-requests")
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .set("X-Idempotency-Key", idempotencyKey)
    .send({
      ...createBody,
      title: "Different request body"
    });

  assert.equal(conflictResponse.status, 409);
  assert.equal(conflictResponse.body.error.code, "IDEMPOTENCY_CONFLICT");

  const addFirstAssignmentResponse = await api
    .post(`/api/v1/service-requests/${requestId}/assignments`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      workerProfileId: workerProfileOne.id
    });

  assert.equal(addFirstAssignmentResponse.status, 201);
  assert.equal(addFirstAssignmentResponse.body.data.request.status, RequestStatus.MATCHED);

  const addSecondAssignmentResponse = await api
    .post(`/api/v1/service-requests/${requestId}/assignments`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      workerProfileId: workerProfileTwo.id
    });

  assert.equal(addSecondAssignmentResponse.status, 201);

  const customerListResponse = await api
    .get("/api/v1/service-requests?page=1&limit=20")
    .set("Authorization", `Bearer ${customer.accessToken}`);

  assert.equal(customerListResponse.status, 200);
  assert.equal(customerListResponse.body.data.length, 1);
  assert.equal(customerListResponse.body.data[0].id, requestId);

  const workerListResponse = await api
    .get("/api/v1/service-requests?status=MATCHED&page=1&limit=20")
    .set("Authorization", `Bearer ${workerOne.accessToken}`);

  assert.equal(workerListResponse.status, 200);
  assert.equal(workerListResponse.body.data.length, 1);
  assert.equal(workerListResponse.body.data[0].id, requestId);

  const outsiderRequestResponse = await api
    .get(`/api/v1/service-requests/${requestId}`)
    .set("Authorization", `Bearer ${outsider.accessToken}`);

  assert.equal(outsiderRequestResponse.status, 403);
  assert.equal(outsiderRequestResponse.body.error.code, "PERMISSION_DENIED");

  const requestDetailResponse = await api
    .get(`/api/v1/service-requests/${requestId}`)
    .set("Authorization", `Bearer ${workerOne.accessToken}`);

  assert.equal(requestDetailResponse.status, 200);
  assert.equal(requestDetailResponse.body.data.assignments.length, 2);

  const firstAssignmentId = addFirstAssignmentResponse.body.data.assignment.id as string;
  const acceptAssignmentResponse = await api
    .post(`/api/v1/service-requests/${requestId}/assignments/${firstAssignmentId}/accept`)
    .set("Authorization", `Bearer ${workerOne.accessToken}`)
    .send({});

  assert.equal(acceptAssignmentResponse.status, 200);
  assert.equal(acceptAssignmentResponse.body.data.request.status, RequestStatus.ACCEPTED);

  const acceptedRequestResponse = await api
    .get(`/api/v1/service-requests/${requestId}`)
    .set("Authorization", `Bearer ${customer.accessToken}`);

  assert.equal(acceptedRequestResponse.status, 200);
  const acceptedAssignments = acceptedRequestResponse.body.data.assignments as Array<{ assignmentStatus: AssignmentStatus; workerProfileId: string }>;
  assert.equal(
    acceptedAssignments.some(
      (assignment) => assignment.workerProfileId === workerProfileOne.id && assignment.assignmentStatus === AssignmentStatus.ACCEPTED
    ),
    true
  );
  assert.equal(
    acceptedAssignments.some(
      (assignment) => assignment.workerProfileId === workerProfileTwo.id && assignment.assignmentStatus === AssignmentStatus.DECLINED
    ),
    true
  );

  const statusHistoryResponse = await api
    .get(`/api/v1/service-requests/${requestId}/status-history`)
    .set("Authorization", `Bearer ${customer.accessToken}`);

  assert.equal(statusHistoryResponse.status, 200);
  assert.deepEqual(
    (statusHistoryResponse.body.data as Array<{ toStatus: RequestStatus }>).map((entry) => entry.toStatus),
    [RequestStatus.OPEN, RequestStatus.MATCHED, RequestStatus.ACCEPTED]
  );
});

test("service requests cover item CRUD, decline, cancel, and manual expiry for owner-visible requests", async () => {
  const customer = await registerAndLogin("customer-two", "Second", "Customer");
  const worker = await registerAndLogin("worker-three", "Third", "Worker");

  const workerProfile = await prisma.workerProfile.create({
    data: {
      userId: worker.userId,
      headline: "Approved Worker Three",
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  const createResponse = await api.post("/api/v1/service-requests").set("Authorization", `Bearer ${customer.accessToken}`).send({
    title: "Paint hallway walls",
    description: "Need a painter to repaint the hallway walls and ceiling.",
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString()
  });

  assert.equal(createResponse.status, 201);
  const requestId = createResponse.body.data.id as string;

  const updateResponse = await api
    .patch(`/api/v1/service-requests/${requestId}`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      title: "<b>Paint hallway and ceiling</b>",
      locationText: "<p>Airport Residential</p>"
    });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.data.title, "Paint hallway and ceiling");
  assert.equal(updateResponse.body.data.locationText, "Airport Residential");

  const addItemResponse = await api
    .post(`/api/v1/service-requests/${requestId}/items`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      label: "Paint buckets",
      quantity: 3,
      note: "White matte finish"
    });

  assert.equal(addItemResponse.status, 201);
  const itemId = (addItemResponse.body.data.items as Array<{ id: string }>)[0].id;

  const patchItemResponse = await api
    .patch(`/api/v1/service-requests/${requestId}/items/${itemId}`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      quantity: 4,
      note: "<b>Bright white</b>"
    });

  assert.equal(patchItemResponse.status, 200);
  assert.equal(
    (patchItemResponse.body.data.items as Array<{ id: string; quantity: number; note: string }>).find((item) => item.id === itemId)?.quantity,
    4
  );

  const deleteItemResponse = await api
    .delete(`/api/v1/service-requests/${requestId}/items/${itemId}`)
    .set("Authorization", `Bearer ${customer.accessToken}`);

  assert.equal(deleteItemResponse.status, 200);

  const addAssignmentResponse = await api
    .post(`/api/v1/service-requests/${requestId}/assignments`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      workerProfileId: workerProfile.id
    });

  assert.equal(addAssignmentResponse.status, 201);
  const assignmentId = addAssignmentResponse.body.data.assignment.id as string;

  const declineAssignmentResponse = await api
    .post(`/api/v1/service-requests/${requestId}/assignments/${assignmentId}/decline`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({});

  assert.equal(declineAssignmentResponse.status, 200);
  assert.equal(declineAssignmentResponse.body.data.assignmentStatus, AssignmentStatus.DECLINED);

  const cancelResponse = await api
    .post(`/api/v1/service-requests/${requestId}/cancel`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      reason: "No longer needed"
    });

  assert.equal(cancelResponse.status, 200);
  assert.equal(cancelResponse.body.data.status, RequestStatus.CANCELLED);

  const secondRequestResponse = await api.post("/api/v1/service-requests").set("Authorization", `Bearer ${customer.accessToken}`).send({
    title: "Install new outdoor lights",
    description: "Need an electrician to install weatherproof outdoor lighting."
  });

  assert.equal(secondRequestResponse.status, 201);
  const expiringRequestId = secondRequestResponse.body.data.id as string;

  const secondAssignmentResponse = await api
    .post(`/api/v1/service-requests/${expiringRequestId}/assignments`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      workerProfileId: workerProfile.id
    });

  assert.equal(secondAssignmentResponse.status, 201);

  await prisma.serviceRequest.update({
    where: { id: expiringRequestId },
    data: {
      expiresAt: new Date(Date.now() - 60_000)
    }
  });

  const expireResponse = await api
    .post(`/api/v1/service-requests/${expiringRequestId}/expire`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({});

  assert.equal(expireResponse.status, 200);
  assert.equal(expireResponse.body.data.status, RequestStatus.EXPIRED);

  const expiredRequestResponse = await api
    .get(`/api/v1/service-requests/${expiringRequestId}`)
    .set("Authorization", `Bearer ${customer.accessToken}`);

  assert.equal(expiredRequestResponse.status, 200);
  assert.equal(expiredRequestResponse.body.data.assignments[0].assignmentStatus, AssignmentStatus.DECLINED);

  const expiredHistoryResponse = await api
    .get(`/api/v1/service-requests/${expiringRequestId}/status-history`)
    .set("Authorization", `Bearer ${customer.accessToken}`);

  assert.equal(expiredHistoryResponse.status, 200);
  assert.deepEqual(
    (expiredHistoryResponse.body.data as Array<{ toStatus: RequestStatus }>).map((entry) => entry.toStatus),
    [RequestStatus.OPEN, RequestStatus.MATCHED, RequestStatus.EXPIRED]
  );
});
