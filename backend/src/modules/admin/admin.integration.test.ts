process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { FraudSignalStatus, NotificationChannel, VerificationStatus } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";
import { verifyAccessToken } from "../auth/auth.tokens";
import { AdminRepository } from "./admin.repository";

const api = request(app);
const password = "Change-This-Password-123!";
const adminRepository = new AdminRepository();

const buildEmail = (label: string): string => `itest-admin-${label}-${randomUUID()}@example.com`;
const buildSlug = (label: string): string => `itest_admin_${label.replace(/-/g, "_")}_${randomUUID().slice(0, 8)}`;

const registerUser = async (label: string, firstName: string, lastName: string) => {
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
    userId: registerResponse.body.data.userId as string
  };
};

const loginUser = async (email: string) => {
  const loginResponse = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(loginResponse.status, 200);

  return {
    accessToken: loginResponse.body.data.tokenPair.accessToken as string
  };
};

const elevateSessionMfa = async (accessToken: string): Promise<void> => {
  const payload = verifyAccessToken(accessToken);

  await prisma.userSession.update({
    where: {
      id: payload.jti
    },
    data: {
      mfaVerified: true
    }
  });
};

const cleanupAdminData = async (): Promise<void> => {
  await prisma.systemConfig.deleteMany({
    where: {
      configKey: {
        startsWith: "itest-admin-"
      }
    }
  });

  await prisma.featureFlag.deleteMany({
    where: {
      flagKey: {
        startsWith: "itest-admin-"
      }
    }
  });

  await prisma.cityConfig.deleteMany({
    where: {
      slug: {
        startsWith: "itest-admin-"
      }
    }
  });

  await prisma.tradeCategory.deleteMany({
    where: {
      slug: {
        startsWith: "itest-admin-"
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-admin-"
      }
    }
  });
};

before(async () => {
  await cleanupAdminData();
  await adminRepository.ensureCatalog();
});

after(async () => {
  await cleanupAdminData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("admin flow covers guarded actions, marketplace views, moderation, support operations, and broadcasts", async () => {
  const adminUser = await registerUser("admin", "Admin", "Operator");
  const supportUser = await registerUser("support", "Support", "Agent");
  const subjectUser = await registerUser("subject", "Subject", "User");
  const customer = await registerUser("customer", "Admin", "Customer");
  const worker = await registerUser("worker", "Admin", "Worker");

  await adminRepository.assignRole(adminUser.userId, "ADMIN", adminUser.userId);
  await adminRepository.assignRole(supportUser.userId, "SUPPORT", adminUser.userId);

  const [adminSession, customerSession] = await Promise.all([loginUser(adminUser.email), loginUser(customer.email)]);
  await elevateSessionMfa(adminSession.accessToken);

  const [tradeCategory, city, workerProfile] = await Promise.all([
    prisma.tradeCategory.create({
      data: {
        slug: buildSlug("trade"),
        name: "Electrical"
      }
    }),
    prisma.cityConfig.create({
      data: {
        slug: buildSlug("city"),
        name: "Tema",
        countryCode: "GH",
        currencyCode: "GHS",
        timezone: "Africa/Accra",
        defaultSearchRadiusKm: 10,
        isEnabled: true
      }
    }),
    prisma.workerProfile.create({
      data: {
        userId: worker.userId,
        headline: "Verified worker",
        verificationStatus: VerificationStatus.APPROVED
      }
    })
  ]);

  await prisma.userProfile.update({
    where: { userId: customer.userId },
    data: {
      cityId: city.id
    }
  });

  await prisma.workerCertification.create({
    data: {
      workerProfileId: workerProfile.id,
      title: "Electrical License",
      certificateUrl: "private/certifications/electrical-license.pdf",
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  const post = await prisma.post.create({
    data: {
      authorUserId: customer.userId,
      body: "Admin content viewer target"
    }
  });

  const createRequestResponse = await api.post("/api/v1/service-requests").set("Authorization", `Bearer ${customerSession.accessToken}`).send({
    tradeCategoryId: tradeCategory.id,
    title: "Fix the office wiring",
    description: "Need a qualified electrician for the office.",
    locationText: "Tema",
    items: [{ label: "Inspection", quantity: 1 }]
  });

  assert.equal(createRequestResponse.status, 201);
  const serviceRequestId = createRequestResponse.body.data.id as string;

  await prisma.serviceRequestAssignment.create({
    data: {
      serviceRequestId,
      workerProfileId: workerProfile.id,
      assignmentStatus: "ACCEPTED"
    }
  });

  await prisma.serviceRequest.update({
    where: { id: serviceRequestId },
    data: {
      status: "ACCEPTED"
    }
  });

  const createBookingResponse = await api.post("/api/v1/bookings").set("Authorization", `Bearer ${customerSession.accessToken}`).send({
    serviceRequestId,
    scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString()
  });

  assert.equal(createBookingResponse.status, 201);
  const bookingId = createBookingResponse.body.data.id as string;

  const createTicketResponse = await api
    .post("/api/v1/support/tickets")
    .set("Authorization", `Bearer ${customerSession.accessToken}`)
    .send({
      subject: "Need admin help",
      body: "I need support with this request.",
      priority: "HIGH"
    });

  assert.equal(createTicketResponse.status, 201);
  const ticketId = createTicketResponse.body.data.id as string;

  const fraudSignal = await prisma.fraudSignal.create({
    data: {
      userId: customer.userId,
      signalKey: "ITEST_ADMIN_SIGNAL",
      score: 92
    }
  });

  const listUsersResponse = await api.get("/api/v1/admin/users?page=1&limit=20").set("Authorization", `Bearer ${adminSession.accessToken}`);
  assert.equal(listUsersResponse.status, 200);
  assert.ok(listUsersResponse.body.data.some((item: { id: string }) => item.id === customer.userId));

  const suspendResponse = await api
    .post(`/api/v1/admin/users/${subjectUser.userId}/suspend`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      reason: "Repeated policy violations in testing"
    });

  assert.equal(suspendResponse.status, 200);

  const reactivateResponse = await api
    .post(`/api/v1/admin/users/${subjectUser.userId}/reactivate`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      notes: "Reactivated after review"
    });

  assert.equal(reactivateResponse.status, 200);

  const featureFlagResponse = await api
    .patch("/api/v1/admin/feature-flags/itest-admin-flag")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      defaultEnabled: true,
      rolloutJson: {
        percentage: 100
      }
    });

  assert.equal(featureFlagResponse.status, 200);

  const configResponse = await api
    .patch("/api/v1/admin/configs/itest-admin-config")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      value: {
        enabled: true
      }
    });

  assert.equal(configResponse.status, 200);

  const createCityResponse = await api
    .post("/api/v1/admin/cities")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      slug: buildSlug("new-city"),
      name: "Takoradi",
      countryCode: "GH",
      currencyCode: "GHS",
      timezone: "Africa/Accra",
      defaultSearchRadiusKm: 12,
      isEnabled: true
    });

  assert.equal(createCityResponse.status, 201);

  const serviceRequestsResponse = await api
    .get("/api/v1/admin/service-requests?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(serviceRequestsResponse.status, 200);
  assert.equal(serviceRequestsResponse.body.pagination.total >= 1, true);

  const bookingsResponse = await api
    .get(`/api/v1/admin/bookings/${bookingId}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(bookingsResponse.status, 200);
  assert.equal(bookingsResponse.body.data.id, bookingId);

  const featuredResponse = await api
    .patch(`/api/v1/admin/featured-workers/${workerProfile.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      action: "ENABLE",
      notes: "Feature this worker for testing"
    });

  assert.equal(featuredResponse.status, 200);

  const subscriptionResponse = await api
    .get(`/api/v1/admin/workers/${workerProfile.id}/subscription`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(subscriptionResponse.status, 200);
  assert.equal(subscriptionResponse.body.data.isFeatured, true);

  const verificationDocsResponse = await api
    .get(`/api/v1/admin/workers/${workerProfile.id}/verification-documents`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(verificationDocsResponse.status, 200);
  assert.equal(verificationDocsResponse.body.data.documents.length, 1);

  const supportTicketsResponse = await api
    .get("/api/v1/admin/support-tickets?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(supportTicketsResponse.status, 200);
  assert.equal(supportTicketsResponse.body.pagination.total >= 1, true);

  const assignTicketResponse = await api
    .patch(`/api/v1/admin/support-tickets/${ticketId}/assign`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      assignedSupportUserId: supportUser.userId
    });

  assert.equal(assignTicketResponse.status, 200);

  const updateTicketResponse = await api
    .patch(`/api/v1/admin/support-tickets/${ticketId}/status`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      status: "WAITING_USER"
    });

  assert.equal(updateTicketResponse.status, 200);

  const fraudSignalsResponse = await api
    .get("/api/v1/admin/fraud-signals?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(fraudSignalsResponse.status, 200);
  assert.equal(fraudSignalsResponse.body.pagination.total >= 1, true);

  const actionFraudSignalResponse = await api
    .patch(`/api/v1/admin/fraud-signals/${fraudSignal.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      action: "REVIEW"
    });

  assert.equal(actionFraudSignalResponse.status, 200);

  const contentResponse = await api
    .get(`/api/v1/admin/content/post/${post.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(contentResponse.status, 200);
  assert.equal(contentResponse.body.data.entityId, post.id);

  const healthResponse = await api.get("/api/v1/admin/system/health").set("Authorization", `Bearer ${adminSession.accessToken}`);
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.body.data.database.ok, true);

  const broadcastResponse = await api
    .post("/api/v1/admin/notifications/broadcast")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      targetAudience: "ALL_USERS",
      title: "System maintenance",
      body: "System maintenance notice for all active test users.",
      channel: "IN_APP"
    });

  assert.equal(broadcastResponse.status, 201);

  const notificationsResponse = await api
    .get("/api/v1/notifications?page=1&limit=20")
    .set("Authorization", `Bearer ${customerSession.accessToken}`);

  assert.equal(notificationsResponse.status, 200);
  assert.ok(
    notificationsResponse.body.data.some(
      (notification: { notificationType: string; channel: NotificationChannel }) =>
        notification.notificationType === "ADMIN_BROADCAST" && notification.channel === NotificationChannel.IN_APP
    )
  );

  const updatedSignal = await prisma.fraudSignal.findUnique({
    where: { id: fraudSignal.id }
  });
  assert.equal(updatedSignal?.status, FraudSignalStatus.REVIEWED);
});
