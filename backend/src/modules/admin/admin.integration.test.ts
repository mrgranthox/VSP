process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import {
  BookingStatus,
  ConversationType,
  FraudSignalStatus,
  MediaCategory,
  MediaStatus,
  MediaVisibility,
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

const elevateSessionMfa = async (accessToken: string, verifiedAt: Date = new Date()): Promise<void> => {
  const payload = verifyAccessToken(accessToken);

  await prisma.userSession.update({
    where: {
      id: payload.jti
    },
    data: {
      mfaVerified: true,
      mfaVerifiedAt: verifiedAt
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

test("admin flow covers guarded actions, marketplace views, moderation, support operations, and broadcasts", { concurrency: false }, async () => {
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
      cityId: city.id,
      bio: "Customer account used for admin integration coverage"
    }
  });

  await prisma.userProfile.update({
    where: { userId: worker.userId },
    data: {
      cityId: city.id,
      bio: "Approved worker profile for admin coverage"
    }
  });

  await prisma.userProfile.update({
    where: { userId: subjectUser.userId },
    data: {
      bio: "Subject account for lifecycle control coverage"
    }
  });

  const [customerMediaAsset, workerMediaAsset] = await Promise.all([
    prisma.mediaAsset.create({
      data: {
        ownerUserId: customer.userId,
        category: MediaCategory.verification_doc,
        visibility: MediaVisibility.PRIVATE,
        mimeType: "application/pdf",
        sizeBytes: BigInt(4096),
        bucket: "itest-admin",
        storageKey: `itest/admin/${randomUUID()}.pdf`,
        status: MediaStatus.READY,
        uploadedAt: new Date(),
        confirmedAt: new Date(),
        finalCdnUrl: "https://cdn.example.com/itest/customer-verification.pdf"
      }
    }),
    prisma.mediaAsset.create({
      data: {
        ownerUserId: worker.userId,
        category: MediaCategory.portfolio_image,
        visibility: MediaVisibility.PUBLIC,
        mimeType: "image/jpeg",
        sizeBytes: BigInt(8192),
        bucket: "itest-admin",
        storageKey: `itest/admin/${randomUUID()}.jpg`,
        status: MediaStatus.READY,
        uploadedAt: new Date(),
        confirmedAt: new Date(),
        finalCdnUrl: "https://cdn.example.com/itest/worker-portfolio.jpg"
      }
    })
  ]);

  await prisma.workerCertification.create({
    data: {
      workerProfileId: workerProfile.id,
      mediaAssetId: workerMediaAsset.id,
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
    }),
    prisma.workerPortfolioItem.create({
      data: {
        workerProfileId: workerProfile.id,
        mediaAssetId: workerMediaAsset.id,
        title: "Commercial rewiring project",
        caption: "Portfolio evidence for admin detail coverage",
        mediaUrl: "https://cdn.example.com/itest/worker-portfolio.jpg",
        sortOrder: 1
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

  await Promise.all([
    prisma.postLike.create({
      data: {
        postId: post.id,
        userId: customer.userId
      }
    }),
    prisma.postSave.create({
      data: {
        postId: post.id,
        userId: customer.userId
      }
    }),
    prisma.commentLike.create({
      data: {
        commentId: comment.id,
        userId: customer.userId
      }
    }),
    prisma.userFollow.create({
      data: {
        followerUserId: customer.userId,
        targetType: "WORKER",
        targetId: workerProfile.id
      }
    }),
    prisma.userFollow.create({
      data: {
        followerUserId: subjectUser.userId,
        targetType: "USER",
        targetId: customer.userId
      }
    }),
    prisma.customerSavedWorker.create({
      data: {
        userId: customer.userId,
        workerProfileId: workerProfile.id
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

  await prisma.conversation.create({
    data: {
      conversationType: ConversationType.SERVICE_REQUEST,
      serviceRequestId,
      participants: {
        create: [{ userId: customer.userId }, { userId: worker.userId }]
      },
      messages: {
        create: {
          senderId: customer.userId,
          body: "Need an update on the electrician visit."
        }
      }
    }
  });

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
  const bulkReport = await prisma.report.create({
    data: {
      reporterUserId: customer.userId,
      entityType: "comment",
      entityId: comment.id,
      reason: "Bulk admin report coverage",
      severity: ModerationSeverity.MEDIUM
    }
  });
  const bulkModerationCase = await prisma.moderationCase.create({
    data: {
      reportId: bulkReport.id,
      assignedAdminUserId: adminUser.userId,
      status: ModerationCaseStatus.OPEN
    }
  });
  const extraSupportTicket = await prisma.supportTicket.create({
    data: {
      openedByUserId: customer.userId,
      subject: "Second admin coverage ticket",
      body: "Second support ticket used for bulk admin coverage",
      priority: "URGENT"
    }
  });
  const [bulkFraudSignalA, bulkFraudSignalB] = await Promise.all([
    prisma.fraudSignal.create({
      data: {
        userId: customer.userId,
        signalKey: "ITEST_ADMIN_BULK_SIGNAL_A",
        score: 77
      }
    }),
    prisma.fraudSignal.create({
      data: {
        userId: customer.userId,
        signalKey: "ITEST_ADMIN_BULK_SIGNAL_B",
        score: 79
      }
    })
  ]);

  const listUsersResponse = await api.get("/api/v1/admin/users?page=1&limit=20").set("Authorization", `Bearer ${adminSession.accessToken}`);
  assert.equal(listUsersResponse.status, 200);
  assert.ok(listUsersResponse.body.data.some((item: { id: string }) => item.id === customer.userId));

  const getUserResponse = await api
    .get(`/api/v1/admin/users/${subjectUser.userId}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(getUserResponse.status, 200);
  assert.equal(getUserResponse.body.data.id, subjectUser.userId);
  assert.equal(Array.isArray(getUserResponse.body.data.activityCollections.posts), true);
  assert.equal(typeof getUserResponse.body.data.profile.bio, "string");

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
  assert.equal(workerDetailResponse.body.data.activityCollections.assignments.length >= 1, true);
  assert.equal(workerDetailResponse.body.data.activityCollections.searchImpressions.length >= 1, true);
  assert.equal(workerDetailResponse.body.data.activityCollections.reviewsReceived.length >= 1, true);
  assert.equal(workerDetailResponse.body.data.recentMediaAssets.length >= 1, true);

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

  const bulkSupportTicketsResponse = await api
    .patch("/api/v1/admin/support-tickets/bulk")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      ticketIds: [ticketId, extraSupportTicket.id],
      assignedSupportUserId: supportUser.userId,
      status: "WAITING_USER"
    });

  assert.equal(bulkSupportTicketsResponse.status, 200);
  assert.equal(bulkSupportTicketsResponse.body.data.updatedCount, 2);

  const supportTicketsExportResponse = await api
    .get("/api/v1/admin/support-tickets/export?status=WAITING_USER")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(supportTicketsExportResponse.status, 200);
  assert.match(String(supportTicketsExportResponse.headers["content-type"]), /text\/csv/);
  assert.match(supportTicketsExportResponse.text, /id,status,priority,subject/);
  assert.match(supportTicketsExportResponse.text, new RegExp(ticketId));

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

  const bulkFraudSignalsResponse = await api
    .patch("/api/v1/admin/fraud-signals/bulk")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      signalIds: [bulkFraudSignalA.id, bulkFraudSignalB.id],
      action: "DISMISS",
      notes: "Bulk fraud dismissal from integration coverage"
    });

  assert.equal(bulkFraudSignalsResponse.status, 200);
  assert.equal(bulkFraudSignalsResponse.body.data.updatedCount, 2);

  const fraudSignalsExportResponse = await api
    .get("/api/v1/admin/fraud-signals/export?status=DISMISSED")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(fraudSignalsExportResponse.status, 200);
  assert.match(String(fraudSignalsExportResponse.headers["content-type"]), /text\/csv/);
  assert.match(fraudSignalsExportResponse.text, /id,status,signalKey,score/);
  assert.match(fraudSignalsExportResponse.text, new RegExp(bulkFraudSignalA.id));

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

  const bulkUpdateReportsResponse = await api
    .patch("/api/v1/admin/reports/bulk")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      reportIds: [report.id, bulkReport.id],
      status: "UNDER_REVIEW",
      notes: "Bulk report triage from integration coverage"
    });

  assert.equal(bulkUpdateReportsResponse.status, 200);
  assert.equal(bulkUpdateReportsResponse.body.data.updatedCount, 2);

  const reportsExportResponse = await api
    .get("/api/v1/admin/reports/export?status=UNDER_REVIEW")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(reportsExportResponse.status, 200);
  assert.match(String(reportsExportResponse.headers["content-type"]), /text\/csv/);
  assert.match(reportsExportResponse.text, /id,status,severity/);
  assert.match(reportsExportResponse.text, new RegExp(report.id));

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

  const bulkModerationActionResponse = await api
    .post("/api/v1/admin/moderation-cases/bulk-actions")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      caseIds: [moderationCase.id, bulkModerationCase.id],
      actionType: "ESCALATE_REVIEW",
      notes: "Bulk moderation from integration coverage"
    });

  assert.equal(bulkModerationActionResponse.status, 200);
  assert.equal(bulkModerationActionResponse.body.data.updatedCount, 2);

  const moderationCasesExportResponse = await api
    .get("/api/v1/admin/moderation-cases/export?status=IN_REVIEW")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(moderationCasesExportResponse.status, 200);
  assert.match(String(moderationCasesExportResponse.headers["content-type"]), /text\/csv/);
  assert.match(moderationCasesExportResponse.text, /id,status,reportId/);
  assert.match(moderationCasesExportResponse.text, new RegExp(moderationCase.id));

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

  const auditLogsExportResponse = await api
    .get("/api/v1/admin/audit-logs/export?action=REPORT_BULK_UPDATED")
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(auditLogsExportResponse.status, 200);
  assert.match(String(auditLogsExportResponse.headers["content-type"]), /text\/csv/);
  assert.match(auditLogsExportResponse.text, /id,action,entityType/);
  assert.match(auditLogsExportResponse.text, /REPORT_BULK_UPDATED/);

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

  const customerDetailResponse = await api
    .get(`/api/v1/admin/users/${customer.userId}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(customerDetailResponse.status, 200);
  assert.equal(customerDetailResponse.body.data.activeSessions.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.profile.city.name, "Tema");
  assert.equal(customerDetailResponse.body.data.activityCollections.posts.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.postLikes.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.postSaves.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.commentLikes.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.savedWorkers.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.messages.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.conversations.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.serviceRequests.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.bookings.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.notifications.length >= 1, true);
  assert.equal(Array.isArray(customerDetailResponse.body.data.activityCollections.reviewsWritten), true);
  assert.equal(customerDetailResponse.body.data.activityCollections.reports.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.supportTickets.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.fraudSignals.length >= 1, true);
  assert.equal(customerDetailResponse.body.data.activityCollections.mediaAssets.length >= 1, true);

  const customerActiveSessionId = customerDetailResponse.body.data.activeSessions[0].id as string;

  const revokeCustomerSessionResponse = await api
    .post(`/api/v1/admin/users/${customer.userId}/sessions/${customerActiveSessionId}/revoke`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(revokeCustomerSessionResponse.status, 200);

  const customerMeAfterAdminRevokeResponse = await api
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${customerSession.accessToken}`);

  assert.equal(customerMeAfterAdminRevokeResponse.status, 401);
  assert.equal(customerMeAfterAdminRevokeResponse.body.error.code, "AUTH_SESSION_EXPIRED");

  const reloggedCustomerSession = await loginUser(customer.email);

  const revokeAllCustomerSessionsResponse = await api
    .post(`/api/v1/admin/users/${customer.userId}/sessions/revoke-all`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`);

  assert.equal(revokeAllCustomerSessionsResponse.status, 200);
  assert.equal(revokeAllCustomerSessionsResponse.body.data.revokedCount >= 1, true);

  const customerMeAfterRevokeAllResponse = await api
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${reloggedCustomerSession.accessToken}`);

  assert.equal(customerMeAfterRevokeAllResponse.status, 401);
  assert.equal(customerMeAfterRevokeAllResponse.body.error.code, "AUTH_SESSION_EXPIRED");

  const updatedSignal = await prisma.fraudSignal.findUnique({
    where: { id: fraudSignal.id }
  });
  assert.equal(updatedSignal?.status, FraudSignalStatus.REVIEWED);

  const dismissedBulkSignals = await prisma.fraudSignal.findMany({
    where: {
      id: {
        in: [bulkFraudSignalA.id, bulkFraudSignalB.id]
      }
    },
    select: {
      status: true
    }
  });
  assert.equal(dismissedBulkSignals.every((signal) => signal.status === FraudSignalStatus.DISMISSED), true);

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

test("admin writes require a fresh MFA step-up and role boundaries remain enforced", { concurrency: false }, async () => {
  const adminUser = await registerUser("rbac-admin", "Admin", "Matrix");
  const moderatorUser = await registerUser("rbac-moderator", "Moderator", "Matrix");
  const supportUser = await registerUser("rbac-support", "Support", "Matrix");
  const customer = await registerUser("rbac-customer", "Customer", "Matrix");

  const featureFlagKey = buildSlug("rbac-flag");
  const configKey = buildSlug("rbac-config");

  await Promise.all([
    adminRepository.assignRole(adminUser.userId, "ADMIN", adminUser.userId),
    adminRepository.assignRole(moderatorUser.userId, "MODERATOR", adminUser.userId),
    adminRepository.assignRole(supportUser.userId, "SUPPORT", adminUser.userId),
    prisma.featureFlag.create({
      data: {
        flagKey: featureFlagKey,
        description: "RBAC matrix feature flag",
        defaultEnabled: false
      }
    }),
    prisma.systemConfig.create({
      data: {
        configKey,
        valueJson: {
          enabled: false
        }
      }
    }),
    prisma.supportTicket.create({
      data: {
        openedByUserId: customer.userId,
        subject: "RBAC coverage ticket",
        body: "Need support assignment"
      }
    }),
    prisma.report.create({
      data: {
        reporterUserId: customer.userId,
        entityType: "post",
        entityId: randomUUID(),
        reason: "RBAC moderation report",
        severity: ModerationSeverity.MEDIUM
      }
    })
  ]);

  const matrixReport = await prisma.report.findFirstOrThrow({
    where: {
      reporterUserId: customer.userId,
      reason: "RBAC moderation report"
    },
    select: {
      id: true
    }
  });

  const [adminSession, moderatorSession, supportSession] = await Promise.all([
    loginUser(adminUser.email),
    loginUser(moderatorUser.email),
    loginUser(supportUser.email)
  ]);

  await elevateSessionMfa(adminSession.accessToken, new Date(Date.now() - 30 * 60 * 1000));

  const staleFeatureFlagResponse = await api
    .patch(`/api/v1/admin/feature-flags/${featureFlagKey}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      defaultEnabled: true
    });

  assert.equal(staleFeatureFlagResponse.status, 403);
  assert.equal(staleFeatureFlagResponse.body.error.code, "MFA_REQUIRED");

  const staleReportBulkResponse = await api
    .patch("/api/v1/admin/reports/bulk")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      reportIds: [matrixReport.id],
      status: "UNDER_REVIEW",
      notes: "Trying bulk triage with stale MFA"
    });

  assert.equal(staleReportBulkResponse.status, 403);
  assert.equal(staleReportBulkResponse.body.error.code, "MFA_REQUIRED");

  await elevateSessionMfa(adminSession.accessToken);

  const freshFeatureFlagResponse = await api
    .patch(`/api/v1/admin/feature-flags/${featureFlagKey}`)
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      defaultEnabled: true
    });

  assert.equal(freshFeatureFlagResponse.status, 200);

  const freshReportBulkResponse = await api
    .patch("/api/v1/admin/reports/bulk")
    .set("Authorization", `Bearer ${adminSession.accessToken}`)
    .send({
      reportIds: [matrixReport.id],
      status: "UNDER_REVIEW",
      notes: "Bulk triage after MFA refresh"
    });

  assert.equal(freshReportBulkResponse.status, 200);

  const moderatorCanViewReports = await api
    .get("/api/v1/admin/reports?page=1&limit=20")
    .set("Authorization", `Bearer ${moderatorSession.accessToken}`);

  assert.equal(moderatorCanViewReports.status, 200);

  const moderatorCannotViewConfigs = await api
    .get("/api/v1/admin/configs")
    .set("Authorization", `Bearer ${moderatorSession.accessToken}`);

  assert.equal(moderatorCannotViewConfigs.status, 403);
  assert.equal(moderatorCannotViewConfigs.body.error.code, "PERMISSION_DENIED");

  const supportCanViewTickets = await api
    .get("/api/v1/admin/support-tickets?page=1&limit=20")
    .set("Authorization", `Bearer ${supportSession.accessToken}`);

  assert.equal(supportCanViewTickets.status, 200);

  const supportCannotViewReports = await api
    .get("/api/v1/admin/reports?page=1&limit=20")
    .set("Authorization", `Bearer ${supportSession.accessToken}`);

  assert.equal(supportCannotViewReports.status, 403);
  assert.equal(supportCannotViewReports.body.error.code, "PERMISSION_DENIED");

  const supportCannotUpdateConfig = await api
    .patch(`/api/v1/admin/configs/${configKey}`)
    .set("Authorization", `Bearer ${supportSession.accessToken}`)
    .send({
      value: {
        enabled: true
      }
    });

  assert.equal(supportCannotUpdateConfig.status, 403);
  assert.equal(supportCannotUpdateConfig.body.error.code, "PERMISSION_DENIED");

  const supportCannotRevokeSession = await api
    .post(`/api/v1/admin/users/${customer.userId}/sessions/${randomUUID()}/revoke`)
    .set("Authorization", `Bearer ${supportSession.accessToken}`);

  assert.equal(supportCannotRevokeSession.status, 403);
  assert.equal(supportCannotRevokeSession.body.error.code, "PERMISSION_DENIED");
});
