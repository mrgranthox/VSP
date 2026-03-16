process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { AssignmentStatus, BookingStatus, RequestStatus, VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-bookings-${label}-${randomUUID()}@example.com`;

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

const createAcceptedRequest = async (customerUserId: string, workerProfileId: string, label: string) => {
  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      customerUserId,
      title: `Booking request ${label}`,
      description: `Need help with booking scenario ${label}.`,
      status: RequestStatus.ACCEPTED,
      assignments: {
        create: {
          workerProfileId,
          assignmentStatus: AssignmentStatus.ACCEPTED,
          respondedAt: new Date()
        }
      }
    }
  });

  await prisma.serviceRequestStatusHistory.create({
    data: {
      serviceRequestId: serviceRequest.id,
      fromStatus: RequestStatus.MATCHED,
      toStatus: RequestStatus.ACCEPTED,
      changedByUserId: customerUserId
    }
  });

  return serviceRequest;
};

const cleanupBookingsData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-bookings-"
      }
    }
  });
};

before(async () => {
  await cleanupBookingsData();
});

after(async () => {
  await cleanupBookingsData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("bookings lifecycle covers create, list, detail, confirm, start, complete, and request status sync", async () => {
  const customer = await registerAndLogin("customer", "Booking", "Customer");
  const worker = await registerAndLogin("worker", "Booking", "Worker");

  const workerProfile = await prisma.workerProfile.create({
    data: {
      userId: worker.userId,
      headline: "Booked worker",
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  const serviceRequest = await createAcceptedRequest(customer.userId, workerProfile.id, "lifecycle");
  const scheduledStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const scheduledEnd = new Date(scheduledStart.getTime() + 2 * 60 * 60 * 1000);

  const createBookingResponse = await api.post("/api/v1/bookings").set("Authorization", `Bearer ${customer.accessToken}`).send({
    serviceRequestId: serviceRequest.id,
    scheduledStart: scheduledStart.toISOString(),
    scheduledEnd: scheduledEnd.toISOString()
  });

  assert.equal(createBookingResponse.status, 201);
  const bookingId = createBookingResponse.body.data.id as string;
  assert.equal(createBookingResponse.body.data.status, BookingStatus.PENDING);

  const listBookingsResponse = await api.get("/api/v1/bookings?page=1&limit=20").set("Authorization", `Bearer ${customer.accessToken}`);
  assert.equal(listBookingsResponse.status, 200);
  assert.equal(listBookingsResponse.body.data.length, 1);
  assert.equal(listBookingsResponse.body.data[0].id, bookingId);

  const bookingDetailResponse = await api.get(`/api/v1/bookings/${bookingId}`).set("Authorization", `Bearer ${worker.accessToken}`);
  assert.equal(bookingDetailResponse.status, 200);
  assert.equal(bookingDetailResponse.body.data.workerProfile.id, workerProfile.id);

  const confirmResponse = await api
    .post(`/api/v1/bookings/${bookingId}/confirm`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({});

  assert.equal(confirmResponse.status, 200);
  assert.equal(confirmResponse.body.data.status, BookingStatus.CONFIRMED);

  const startResponse = await api.post(`/api/v1/bookings/${bookingId}/start`).set("Authorization", `Bearer ${worker.accessToken}`).send({});
  assert.equal(startResponse.status, 200);
  assert.equal(startResponse.body.data.status, BookingStatus.IN_PROGRESS);

  const requestDuringStart = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequest.id },
    select: { status: true }
  });
  assert.equal(requestDuringStart?.status, RequestStatus.IN_PROGRESS);

  const completeResponse = await api
    .post(`/api/v1/bookings/${bookingId}/complete`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({});

  assert.equal(completeResponse.status, 200);
  assert.equal(completeResponse.body.data.status, BookingStatus.COMPLETED);
  assert.ok(completeResponse.body.data.completedAt);

  const completedRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequest.id },
    select: { status: true }
  });
  assert.equal(completedRequest?.status, RequestStatus.COMPLETED);

  const statusHistory = await prisma.serviceRequestStatusHistory.findMany({
    where: {
      serviceRequestId: serviceRequest.id
    },
    orderBy: {
      changedAt: "asc"
    }
  });
  assert.deepEqual(
    statusHistory.map((entry) => entry.toStatus).slice(-2),
    [RequestStatus.IN_PROGRESS, RequestStatus.COMPLETED]
  );
});

test("bookings cover conflict detection, reschedule response, cancel, and access control", async () => {
  const customer = await registerAndLogin("customer-two", "Second", "Customer");
  const worker = await registerAndLogin("worker-two", "Second", "Worker");
  const outsider = await registerAndLogin("outsider", "Outside", "Viewer");

  const workerProfile = await prisma.workerProfile.create({
    data: {
      userId: worker.userId,
      headline: "Conflict worker",
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  const blockingRequest = await createAcceptedRequest(customer.userId, workerProfile.id, "blocking");
  await prisma.booking.create({
    data: {
      serviceRequestId: blockingRequest.id,
      workerProfileId: workerProfile.id,
      customerUserId: customer.userId,
      scheduledStart: new Date("2026-05-10T12:00:00.000Z"),
      scheduledEnd: new Date("2026-05-10T14:00:00.000Z"),
      status: BookingStatus.CONFIRMED
    }
  });

  const requestForApiBooking = await createAcceptedRequest(customer.userId, workerProfile.id, "api");

  const createConflictResponse = await api.post("/api/v1/bookings").set("Authorization", `Bearer ${customer.accessToken}`).send({
    serviceRequestId: requestForApiBooking.id,
    scheduledStart: "2026-05-10T12:30:00.000Z",
    scheduledEnd: "2026-05-10T13:30:00.000Z"
  });

  assert.equal(createConflictResponse.status, 409);
  assert.equal(createConflictResponse.body.error.code, "BOOKING_TIME_CONFLICT");

  const createBookingResponse = await api.post("/api/v1/bookings").set("Authorization", `Bearer ${customer.accessToken}`).send({
    serviceRequestId: requestForApiBooking.id,
    scheduledStart: "2026-05-10T16:00:00.000Z",
    scheduledEnd: "2026-05-10T18:00:00.000Z"
  });

  assert.equal(createBookingResponse.status, 201);
  const bookingId = createBookingResponse.body.data.id as string;

  const outsiderResponse = await api.get(`/api/v1/bookings/${bookingId}`).set("Authorization", `Bearer ${outsider.accessToken}`);
  assert.equal(outsiderResponse.status, 403);
  assert.equal(outsiderResponse.body.error.code, "PERMISSION_DENIED");

  const confirmResponse = await api
    .post(`/api/v1/bookings/${bookingId}/confirm`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({});

  assert.equal(confirmResponse.status, 200);
  assert.equal(confirmResponse.body.data.status, BookingStatus.CONFIRMED);

  const createRescheduleConflictResponse = await api
    .post(`/api/v1/bookings/${bookingId}/reschedule`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      newStart: "2026-05-10T12:30:00.000Z",
      newEnd: "2026-05-10T13:30:00.000Z"
    });

  assert.equal(createRescheduleConflictResponse.status, 201);
  const conflictingRescheduleId = createRescheduleConflictResponse.body.data.reschedule.id as string;

  const acceptConflictResponse = await api
    .post(`/api/v1/bookings/${bookingId}/reschedule/${conflictingRescheduleId}/respond`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({
      action: "ACCEPT"
    });

  assert.equal(acceptConflictResponse.status, 409);
  assert.equal(acceptConflictResponse.body.error.code, "BOOKING_TIME_CONFLICT");

  const declineConflictResponse = await api
    .post(`/api/v1/bookings/${bookingId}/reschedule/${conflictingRescheduleId}/respond`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({
      action: "DECLINE"
    });

  assert.equal(declineConflictResponse.status, 200);
  assert.equal(declineConflictResponse.body.data.reschedule.status, "DECLINED");

  const createRescheduleResponse = await api
    .post(`/api/v1/bookings/${bookingId}/reschedule`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      newStart: "2026-05-10T18:30:00.000Z",
      newEnd: "2026-05-10T20:00:00.000Z"
    });

  assert.equal(createRescheduleResponse.status, 201);
  const rescheduleId = createRescheduleResponse.body.data.reschedule.id as string;

  const acceptRescheduleResponse = await api
    .post(`/api/v1/bookings/${bookingId}/reschedule/${rescheduleId}/respond`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({
      action: "ACCEPT"
    });

  assert.equal(acceptRescheduleResponse.status, 200);
  assert.equal(acceptRescheduleResponse.body.data.booking.status, BookingStatus.RESCHEDULED);
  assert.equal(acceptRescheduleResponse.body.data.booking.scheduledStart, "2026-05-10T18:30:00.000Z");

  const cancelResponse = await api
    .post(`/api/v1/bookings/${bookingId}/cancel`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      reason: "Schedule changed"
    });

  assert.equal(cancelResponse.status, 200);
  assert.equal(cancelResponse.body.data.status, BookingStatus.CANCELLED);
  assert.equal(cancelResponse.body.data.cancellations.length, 1);

  const cancelledRequest = await prisma.serviceRequest.findUnique({
    where: { id: requestForApiBooking.id },
    select: { status: true }
  });
  assert.equal(cancelledRequest?.status, RequestStatus.CANCELLED);
});
