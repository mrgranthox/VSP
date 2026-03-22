process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { AssignmentStatus, VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-notifications-${label}-${randomUUID()}@example.com`;
const buildSlug = (label: string): string => `itest-notifications-${label}-${randomUUID().slice(0, 8)}`;

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

const cleanupNotificationsData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-notifications-"
      }
    }
  });

  await prisma.tradeCategory.deleteMany({
    where: {
      slug: {
        startsWith: "itest-notifications-"
      }
    }
  });
};

before(async () => {
  await cleanupNotificationsData();
});

after(async () => {
  await cleanupNotificationsData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("notifications module covers event fan-in, read state, preferences, and push devices", async () => {
  const customer = await registerAndLogin("customer", "Notify", "Customer");
  const worker = await registerAndLogin("worker", "Notify", "Worker");

  const tradeCategory = await prisma.tradeCategory.create({
    data: {
      slug: buildSlug("trade"),
      name: "Notification Trade",
      isEnabled: true
    }
  });

  const workerProfile = await prisma.workerProfile.create({
    data: {
      userId: worker.userId,
      headline: "Notification worker",
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  const createRequestResponse = await api.post("/api/v1/service-requests").set("Authorization", `Bearer ${customer.accessToken}`).send({
    tradeCategoryId: tradeCategory.id,
    title: "Need booking notifications",
    description: "A service request used to exercise notification fan-in."
  });

  assert.equal(createRequestResponse.status, 201);
  const requestId = createRequestResponse.body.data.id as string;

  const assignWorkerResponse = await api
    .post(`/api/v1/service-requests/${requestId}/assignments`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      workerProfileId: workerProfile.id
    });

  assert.equal(assignWorkerResponse.status, 201);
  const assignmentId = assignWorkerResponse.body.data.assignment.id as string;

  const assignment = await prisma.serviceRequestAssignment.findUnique({
    where: {
      id: assignmentId
    },
    select: {
      id: true
    }
  });
  assert.ok(assignment);

  const pendingAssignment = await prisma.serviceRequestAssignment.findFirst({
    where: {
      serviceRequestId: requestId,
      workerProfileId: workerProfile.id,
      assignmentStatus: AssignmentStatus.PENDING
    }
  });
  assert.ok(pendingAssignment);

  const acceptAssignmentResponse = await api
    .post(`/api/v1/service-requests/${requestId}/assignments/${pendingAssignment!.id}/accept`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({});

  assert.equal(acceptAssignmentResponse.status, 200);

  const createBookingResponse = await api.post("/api/v1/bookings").set("Authorization", `Bearer ${customer.accessToken}`).send({
    serviceRequestId: requestId,
    scheduledStart: "2026-07-01T09:00:00.000Z",
    scheduledEnd: "2026-07-01T11:00:00.000Z"
  });

  assert.equal(createBookingResponse.status, 201);
  const bookingId = createBookingResponse.body.data.id as string;

  const confirmBookingResponse = await api
    .post(`/api/v1/bookings/${bookingId}/confirm`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({});

  assert.equal(confirmBookingResponse.status, 200);

  const createConversationResponse = await api.post("/api/v1/conversations").set("Authorization", `Bearer ${customer.accessToken}`).send({
    type: "DIRECT",
    participantIds: [worker.userId]
  });

  assert.equal(createConversationResponse.status, 201);
  const conversationId = createConversationResponse.body.data.id as string;

  const sendMessageResponse = await api
    .post(`/api/v1/conversations/${conversationId}/messages`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      clientMessageId: randomUUID(),
      messageType: "TEXT",
      body: "Checking in about the booking."
    });

  assert.equal(sendMessageResponse.status, 201);

  const createRescheduleResponse = await api
    .post(`/api/v1/bookings/${bookingId}/reschedule`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      newStart: "2026-07-01T12:00:00.000Z",
      newEnd: "2026-07-01T14:00:00.000Z"
    });

  assert.equal(createRescheduleResponse.status, 201);
  const rescheduleId = createRescheduleResponse.body.data.reschedule.id as string;

  const respondRescheduleResponse = await api
    .post(`/api/v1/bookings/${bookingId}/reschedule/${rescheduleId}/respond`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({
      action: "ACCEPT"
    });

  assert.equal(respondRescheduleResponse.status, 200);

  const cancelBookingResponse = await api
    .post(`/api/v1/bookings/${bookingId}/cancel`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      reason: "Plans changed"
    });

  assert.equal(cancelBookingResponse.status, 200);

  const workerNotificationsResponse = await api
    .get("/api/v1/notifications?page=1&limit=20")
    .set("Authorization", `Bearer ${worker.accessToken}`);

  assert.equal(workerNotificationsResponse.status, 200);
  const workerNotificationTypes = workerNotificationsResponse.body.data.map((item: any) => item.notificationType);
  assert.ok(workerNotificationTypes.includes("REQUEST_ASSIGNED"));
  assert.ok(workerNotificationTypes.includes("NEW_MESSAGE"));
  assert.ok(workerNotificationTypes.includes("BOOKING_RESCHEDULE_REQUESTED"));
  assert.ok(workerNotificationTypes.includes("BOOKING_CANCELLED"));
  assert.equal(workerNotificationsResponse.body.meta.unreadCount, workerNotificationsResponse.body.data.length);

  const firstWorkerNotificationId = workerNotificationsResponse.body.data[0].id as string;
  const notificationDetailResponse = await api
    .get(`/api/v1/notifications/${firstWorkerNotificationId}`)
    .set("Authorization", `Bearer ${worker.accessToken}`);

  assert.equal(notificationDetailResponse.status, 200);
  assert.equal(notificationDetailResponse.body.data.id, firstWorkerNotificationId);

  const markReadResponse = await api
    .post(`/api/v1/notifications/${firstWorkerNotificationId}/read`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({});

  assert.equal(markReadResponse.status, 200);
  assert.equal(markReadResponse.body.data.isRead, true);

  const markAllReadResponse = await api.post("/api/v1/notifications/read-all").set("Authorization", `Bearer ${worker.accessToken}`).send({});
  assert.equal(markAllReadResponse.status, 200);
  assert.ok(markAllReadResponse.body.data.updatedCount >= 0);

  const workerNotificationsAfterRead = await api
    .get("/api/v1/notifications?page=1&limit=20")
    .set("Authorization", `Bearer ${worker.accessToken}`);

  assert.equal(workerNotificationsAfterRead.status, 200);
  assert.equal(workerNotificationsAfterRead.body.meta.unreadCount, 0);

  const customerNotificationsResponse = await api
    .get("/api/v1/notifications?page=1&limit=20")
    .set("Authorization", `Bearer ${customer.accessToken}`);

  assert.equal(customerNotificationsResponse.status, 200);
  const customerNotificationTypes = customerNotificationsResponse.body.data.map((item: any) => item.notificationType);
  assert.ok(customerNotificationTypes.includes("BOOKING_CONFIRMED"));
  assert.ok(customerNotificationTypes.includes("BOOKING_RESCHEDULE_RESPONDED"));

  const getPreferencesResponse = await api
    .get("/api/v1/notifications/preferences")
    .set("Authorization", `Bearer ${worker.accessToken}`);

  assert.equal(getPreferencesResponse.status, 200);
  assert.equal(getPreferencesResponse.body.data.chatPushEnabled, true);

  const updatePreferencesResponse = await api
    .patch("/api/v1/notifications/preferences")
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({
      marketingEmailEnabled: true,
      quietHoursStart: 22,
      quietHoursEnd: 6
    });

  assert.equal(updatePreferencesResponse.status, 200);
  assert.equal(updatePreferencesResponse.body.data.marketingEmailEnabled, true);
  assert.equal(updatePreferencesResponse.body.data.quietHoursStart, 22);

  const registerPushDeviceResponse = await api
    .post("/api/v1/push-devices")
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({
      deviceToken: `device-${randomUUID()}`,
      platform: "web"
    });

  assert.equal(registerPushDeviceResponse.status, 201);
  const pushDeviceId = registerPushDeviceResponse.body.data.id as string;

  const deletePushDeviceResponse = await api
    .delete(`/api/v1/push-devices/${pushDeviceId}`)
    .set("Authorization", `Bearer ${worker.accessToken}`);

  assert.equal(deletePushDeviceResponse.status, 200);
});
