process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import {
  BookingStatus,
  FraudSignalStatus,
  ModerationCaseStatus,
  ModerationSeverity,
  NotificationChannel,
  PaymentIntentStatus,
  VerificationStatus
} from "@prisma/client";
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
  const pendingWorker = await registerUser("pending-worker", "Pending", "Worker");

  const featureFlagKey = buildSlug("flag");
  const configKey = buildSlug("config");
  const contentEntityType = "post";

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
    }),
    prisma.workerProfile.create({
      data: {
        userId: pendingWorker.userId,
        headline: "Pending verification worker",
        verificationStatus: VerificationStatus.SUBMITTED
      }
    })
  ]);

  const pendingWorkerProfile = await prisma.workerProfile.findUniqueOrThrow({
    where: {
      userId: pendingWorker.userId
    }
  });

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

  await Promise.all([
    prisma.workerCertification.create({
      data: {
        workerProfileId: pendingWorkerProfile.id,
        title: "Pending License",
        certificateUrl: "private/certifications/pending-license.pdf",
        verificationStatus: VerificationStatus.SUBMITTED
      }
    }),
    prisma.workerVerificationRequest.create({
      data: {
        workerProfileId: pendingWorkerProfile.id,
        status: VerificationStatus.SUBMITTED,
        submittedAt: new Date()
      }
    })
  ]);

  const post = await prisma.post.create({
    data: {
      authorUserId: customer.userId,
      body: "Admin content viewer target"
    }
  });

  const postToDelete = await prisma.post.create({
    data: {
      authorUserId: customer.userId,
      body: "Admin delete target"
    }
  });

  const [comment, commentToDelete] = await Promise.all([
    prisma.comment.create({
      data: {
        postId: post.id,
        authorUserId: worker.userId,
        body: "Admin comment viewer target"
      }
    }),
    prisma.comment.create({
      data: {
        postId: postToDelete.id,
        authorUserId: worker.userId,
        body: "Admin comment delete target"
      }
    })
  ]);

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

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.COMPLETED,
      completedAt: new Date()
    }
  });

  const review = await prisma.review.create({
    data: {
      bookingId,
      reviewerUserId: customer.userId,
      revieweeUserId: worker.userId,
      rating: 5,
      body: "Great work from admin integration coverage"
    }
  });

  await Promise.all([
    prisma.reviewDimensionScore.create({
      data: {
        reviewId: review.id,
        dimensionKey: "quality",
        score: 5
      }
    }),
    prisma.comment.create({
      data: {
        reviewId: review.id,
        authorUserId: worker.userId,
        body: "Admin review content target"
      }
    }),
    prisma.paymentIntent.create({
      data: {
        userId: customer.userId,
        bookingId,
        amountMinor: 25000,
        currencyCode: "GHS",
        status: PaymentIntentStatus.SUCCEEDED
      }
    }),
    prisma.searchImpression.create({
      data: {
        userId: customer.userId,
        queryText: "electrician",
        workerProfileId: workerProfile.id,
        rankPosition: 1,
        cityId: city.id
      }
    })
  ]);

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

  const report = await prisma.report.create({
    data: {
      reporterUserId: customer.userId,
      entityType: "post",
      entityId: post.id,
      reason: "Spam content for admin coverage",
      severity: ModerationSeverity.HIGH
    }
  });

  const moderationCase = await prisma.moderationCase.create({
    data: {
      reportId: report.id,
      assignedAdminUserId: adminUser.userId,
      status: ModerationCaseStatus.OPEN
    }
  });

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

  const getUserResponse = await api
    .get(`/api/v1/admin/users/${subjectUser.userId}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(getUserResponse.status, 200);
  assert.equal(getUserResponse.body.data.id, subjectUser.userId);

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
    .patch(`/api/v1/admin/feature-flags/${featureFlagKey}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      defaultEnabled: true,
      rolloutJson: {
        percentage: 100
      }
    });

  assert.equal(featureFlagResponse.status, 200);

  const configResponse = await api
    .patch(`/api/v1/admin/configs/${configKey}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      value: {
        enabled: true
      }
    });

  assert.equal(configResponse.status, 200);

  const featureFlagsResponse = await api
    .get("/api/v1/admin/feature-flags")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(featureFlagsResponse.status, 200);
  assert.ok(featureFlagsResponse.body.data.some((item: { flagKey: string }) => item.flagKey === featureFlagKey));

  const configsResponse = await api
    .get("/api/v1/admin/configs")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(configsResponse.status, 200);
  assert.ok(configsResponse.body.data.some((item: { configKey: string }) => item.configKey === configKey));

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
  const createdCityId = createCityResponse.body.data.id as string;

  const citiesResponse = await api
    .get("/api/v1/admin/cities?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(citiesResponse.status, 200);
  assert.equal(citiesResponse.body.pagination.total >= 1, true);

  const updateCityResponse = await api
    .patch(`/api/v1/admin/cities/${createdCityId}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      isEnabled: false,
      defaultSearchRadiusKm: 20
    });

  assert.equal(updateCityResponse.status, 200);

  const serviceRequestsResponse = await api
    .get("/api/v1/admin/service-requests?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(serviceRequestsResponse.status, 200);
  assert.equal(serviceRequestsResponse.body.pagination.total >= 1, true);

  const serviceRequestDetailResponse = await api
    .get(`/api/v1/admin/service-requests/${serviceRequestId}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(serviceRequestDetailResponse.status, 200);
  assert.equal(serviceRequestDetailResponse.body.data.id, serviceRequestId);

  const listBookingsResponse = await api
    .get("/api/v1/admin/bookings?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(listBookingsResponse.status, 200);
  assert.equal(listBookingsResponse.body.pagination.total >= 1, true);

  const bookingsResponse = await api
    .get(`/api/v1/admin/bookings/${bookingId}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(bookingsResponse.status, 200);
  assert.equal(bookingsResponse.body.data.id, bookingId);

  const listWorkersResponse = await api
    .get("/api/v1/admin/workers?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(listWorkersResponse.status, 200);
  assert.equal(listWorkersResponse.body.pagination.total >= 2, true);

  const workerDetailResponse = await api
    .get(`/api/v1/admin/workers/${workerProfile.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(workerDetailResponse.status, 200);
  assert.equal(workerDetailResponse.body.data.id, workerProfile.id);

  const rejectWorkerResponse = await api
    .post(`/api/v1/admin/workers/${pendingWorkerProfile.id}/reject-verification`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      reviewNotes: "Rejected during admin integration coverage"
    });

  assert.equal(rejectWorkerResponse.status, 200);

  const verifyWorkerResponse = await api
    .post(`/api/v1/admin/workers/${pendingWorkerProfile.id}/verify`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      notes: "Approved after admin integration verification"
    });

  assert.equal(verifyWorkerResponse.status, 200);

  const featuredWorkersResponse = await api
    .get("/api/v1/admin/featured-workers?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(featuredWorkersResponse.status, 200);
  assert.equal(featuredWorkersResponse.body.pagination.total >= 1, true);

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

  const extendSubscriptionResponse = await api
    .patch(`/api/v1/admin/workers/${workerProfile.id}/subscription`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      action: "EXTEND",
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      notes: "Extend featured worker for admin coverage"
    });

  assert.equal(extendSubscriptionResponse.status, 200);

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

  const postsResponse = await api
    .get("/api/v1/admin/posts?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(postsResponse.status, 200);
  assert.equal(postsResponse.body.pagination.total >= 2, true);

  const deleteCommentResponse = await api
    .delete(`/api/v1/admin/comments/${commentToDelete.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(deleteCommentResponse.status, 200);

  const deletePostResponse = await api
    .delete(`/api/v1/admin/posts/${postToDelete.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(deletePostResponse.status, 200);

  const reportsResponse = await api
    .get("/api/v1/admin/reports?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(reportsResponse.status, 200);
  assert.equal(reportsResponse.body.pagination.total >= 1, true);

  const reportDetailResponse = await api
    .get(`/api/v1/admin/reports/${report.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(reportDetailResponse.status, 200);
  assert.equal(reportDetailResponse.body.data.id, report.id);

  const moderationCasesResponse = await api
    .get("/api/v1/admin/moderation-cases?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(moderationCasesResponse.status, 200);
  assert.equal(moderationCasesResponse.body.pagination.total >= 1, true);

  const moderationCaseDetailResponse = await api
    .get(`/api/v1/admin/moderation-cases/${moderationCase.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(moderationCaseDetailResponse.status, 200);
  assert.equal(moderationCaseDetailResponse.body.data.id, moderationCase.id);

  const addModerationActionResponse = await api
    .post(`/api/v1/admin/moderation-cases/${moderationCase.id}/actions`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      actionType: "DISMISS_REPORT",
      entityType: "post",
      entityId: post.id,
      notes: "Dismissed during admin integration coverage"
    });

  assert.equal(addModerationActionResponse.status, 201);

  const contentResponse = await api
    .get(`/api/v1/admin/content/${contentEntityType}/${post.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(contentResponse.status, 200);
  assert.equal(contentResponse.body.data.entityId, post.id);

  const commentContentResponse = await api
    .get(`/api/v1/admin/content/${"comment"}/${comment.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(commentContentResponse.status, 200);
  assert.equal(commentContentResponse.body.data.entityId, comment.id);

  const reviewContentResponse = await api
    .get(`/api/v1/admin/content/${"review"}/${review.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(reviewContentResponse.status, 200);
  assert.equal(reviewContentResponse.body.data.entityId, review.id);

  const deleteReviewResponse = await api
    .delete(`/api/v1/admin/reviews/${review.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(deleteReviewResponse.status, 200);

  const auditLogsResponse = await api
    .get("/api/v1/admin/audit-logs?page=1&limit=20")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(auditLogsResponse.status, 200);
  assert.equal(auditLogsResponse.body.pagination.total >= 1, true);

  const overviewAnalyticsResponse = await api
    .get("/api/v1/admin/analytics/overview")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(overviewAnalyticsResponse.status, 200);

  const searchAnalyticsResponse = await api
    .get("/api/v1/admin/analytics/search")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(searchAnalyticsResponse.status, 200);

  const engagementAnalyticsResponse = await api
    .get("/api/v1/admin/analytics/engagement")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(engagementAnalyticsResponse.status, 200);

  const marketplaceAnalyticsResponse = await api
    .get("/api/v1/admin/analytics/marketplace")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(marketplaceAnalyticsResponse.status, 200);

  const rolesResponse = await api
    .get("/api/v1/admin/roles")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(rolesResponse.status, 200);

  const permissionsResponse = await api
    .get("/api/v1/admin/permissions")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(permissionsResponse.status, 200);

  const supportRole = rolesResponse.body.data.find((role: { roleKey: string }) => role.roleKey === "SUPPORT") as
    | { id: string; roleKey: string; permissionKeys: string[] }
    | undefined;

  assert.ok(supportRole);

  const updateRolePermissionsResponse = await api
    .patch(`/api/v1/admin/roles/${supportRole.id}/permissions`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      permissionKeys: ["SUPPORT_TICKET_VIEW", "SUPPORT_TICKET_ASSIGN", "REPORT_VIEW"]
    });

  assert.equal(updateRolePermissionsResponse.status, 200);

  const assignAdminRoleResponse = await api
    .post(`/api/v1/admin/users/${subjectUser.userId}/roles`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      roleKey: "SUPPORT"
    });

  assert.equal(assignAdminRoleResponse.status, 200);

  const removeAdminRoleResponse = await api
    .delete(`/api/v1/admin/users/${subjectUser.userId}/roles/${supportRole.id}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(removeAdminRoleResponse.status, 200);

  const restoreRolePermissionsResponse = await api
    .patch(`/api/v1/admin/roles/${supportRole.id}/permissions`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      permissionKeys: supportRole.permissionKeys
    });

  assert.equal(restoreRolePermissionsResponse.status, 200);

  const healthResponse = await api.get("/api/v1/admin/system/health").set("Authorization", `Bearer ${adminSession.accessToken}`);
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.body.data.database.ok, true);

  const metricsResponse = await api
    .get("/api/v1/admin/system/metrics")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(metricsResponse.status, 200);
  assert.equal(metricsResponse.body.data.totals.users >= 5, true);

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

  const deletedPost = await prisma.post.findUnique({
    where: { id: postToDelete.id },
    select: { isDeleted: true }
  });
  assert.equal(deletedPost?.isDeleted, true);

  const deletedComment = await prisma.comment.findUnique({
    where: { id: commentToDelete.id },
    select: { isDeleted: true }
  });
  assert.equal(deletedComment?.isDeleted, true);

  const deletedReview = await prisma.review.findUnique({
    where: { id: review.id },
    select: { id: true }
  });
  assert.equal(deletedReview, null);
});
