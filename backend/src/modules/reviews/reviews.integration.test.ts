process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { BookingStatus, RequestStatus, VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-reviews-${label}-${randomUUID()}@example.com`;

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

const cleanupReviewsData = async (): Promise<void> => {
  await prisma.report.deleteMany({
    where: {
      reporterUser: {
        email: {
          startsWith: "itest-reviews-"
        }
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-reviews-"
      }
    }
  });
};

before(async () => {
  await cleanupReviewsData();
});

after(async () => {
  await cleanupReviewsData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("reviews module covers eligible creation, dimensions, replies, reporting, and worker aggregates", async () => {
  const customer = await registerAndLogin("customer", "Review", "Customer");
  const worker = await registerAndLogin("worker", "Review", "Worker");
  const outsider = await registerAndLogin("outsider", "Review", "Outsider");

  const workerProfile = await prisma.workerProfile.create({
    data: {
      userId: worker.userId,
      headline: "Reviewed worker",
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      customerUserId: customer.userId,
      title: "Completed review request",
      description: "A completed request used for review integration testing.",
      status: RequestStatus.COMPLETED
    }
  });

  const booking = await prisma.booking.create({
    data: {
      serviceRequestId: serviceRequest.id,
      workerProfileId: workerProfile.id,
      customerUserId: customer.userId,
      scheduledStart: new Date(Date.now() - 3 * 60 * 60 * 1000),
      scheduledEnd: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: BookingStatus.COMPLETED,
      completedAt: new Date()
    }
  });

  const createReviewResponse = await api.post("/api/v1/reviews").set("Authorization", `Bearer ${customer.accessToken}`).send({
    bookingId: booking.id,
    rating: 5,
    body: "<b>Outstanding</b> service with great communication."
  });

  assert.equal(createReviewResponse.status, 201);
  const reviewId = createReviewResponse.body.data.id as string;
  assert.equal(createReviewResponse.body.data.body, "Outstanding service with great communication.");
  assert.equal(createReviewResponse.body.data.rating, 5);

  const aggregatedWorkerProfile = await prisma.workerProfile.findUnique({
    where: {
      id: workerProfile.id
    },
    select: {
      avgRating: true,
      totalReviews: true,
      jobsCompleted: true
    }
  });

  assert.equal(Number(aggregatedWorkerProfile?.avgRating ?? 0), 5);
  assert.equal(aggregatedWorkerProfile?.totalReviews, 1);
  assert.equal(aggregatedWorkerProfile?.jobsCompleted, 1);

  const addDimensionsResponse = await api
    .post(`/api/v1/reviews/${reviewId}/dimensions`)
    .set("Authorization", `Bearer ${customer.accessToken}`)
    .send({
      dimensions: [
        { dimensionKey: "quality", score: 5 },
        { dimensionKey: "communication", score: 4 }
      ]
    });

  assert.equal(addDimensionsResponse.status, 200);
  assert.equal(addDimensionsResponse.body.data.dimensions.length, 2);

  const getReviewResponse = await api.get(`/api/v1/reviews/${reviewId}`);
  assert.equal(getReviewResponse.status, 200);
  assert.equal(getReviewResponse.body.data.booking.workerProfileId, workerProfile.id);

  const workerReviewsResponse = await api.get(`/api/v1/workers/${workerProfile.id}/reviews?minRating=4&page=1&limit=20`);
  assert.equal(workerReviewsResponse.status, 200);
  assert.equal(workerReviewsResponse.body.data.length, 1);
  assert.equal(workerReviewsResponse.body.data[0].id, reviewId);

  const createReplyResponse = await api
    .post(`/api/v1/reviews/${reviewId}/replies`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({ body: "Thank you <b>very much</b>." });

  assert.equal(createReplyResponse.status, 201);
  const replyId = createReplyResponse.body.data.id as string;
  assert.equal(createReplyResponse.body.data.body, "Thank you very much .");

  const updateReplyResponse = await api
    .patch(`/api/v1/reviews/${reviewId}/replies/${replyId}`)
    .set("Authorization", `Bearer ${worker.accessToken}`)
    .send({ body: "Thank you again for the feedback." });

  assert.equal(updateReplyResponse.status, 200);
  assert.equal(updateReplyResponse.body.data.body, "Thank you again for the feedback.");

  const deleteReplyResponse = await api
    .delete(`/api/v1/reviews/${reviewId}/replies/${replyId}`)
    .set("Authorization", `Bearer ${worker.accessToken}`);

  assert.equal(deleteReplyResponse.status, 200);

  const reportReviewResponse = await api
    .post(`/api/v1/reviews/${reviewId}/report`)
    .set("Authorization", `Bearer ${outsider.accessToken}`)
    .send({
      reason: "Potentially misleading review",
      severity: "LOW"
    });

  assert.equal(reportReviewResponse.status, 201);
  assert.ok(reportReviewResponse.body.data.reportId);
  assert.equal(reportReviewResponse.body.data.moderationCaseId, null);

  const [reviewReport, reviewNotification] = await Promise.all([
    prisma.report.findFirst({
      where: {
        entityType: "REVIEW",
        entityId: reviewId,
        reporterUserId: outsider.userId
      }
    }),
    prisma.notification.findFirst({
      where: {
        userId: worker.userId,
        notificationType: "REVIEW_RECEIVED"
      }
    })
  ]);

  assert.ok(reviewReport);
  assert.ok(reviewNotification);
});
