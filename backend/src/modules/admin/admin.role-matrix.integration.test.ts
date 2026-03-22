process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";

import {
  AdminRoleKey,
  AssignmentStatus,
  BookingStatus,
  FraudSignalStatus,
  ModerationCaseStatus,
  ModerationSeverity,
  NotificationChannel,
  RequestStatus,
  SupportPriority,
  UserStatus,
  VerificationStatus
} from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";
import { verifyAccessToken } from "../auth/auth.tokens";
import { type AdminPermissionKey, DEFAULT_ROLE_PERMISSION_KEYS } from "./admin.permissions";
import { AdminRepository } from "./admin.repository";

const api = request(app);
const adminRepository = new AdminRepository();
const password = "Change-This-Password-123!";
const matrixPrefix = "itest-rbac-matrix";

type MatrixRole = AdminRoleKey | "PLAIN";
type RequestMethod = "get" | "post" | "patch" | "delete";

interface ActorSession {
  role: MatrixRole;
  userId: string;
  email: string;
  accessToken: string;
}

interface SharedFixtures {
  actors: Record<MatrixRole, ActorSession>;
  cityId: string;
  tradeCategoryId: string;
  subjectUserId: string;
  customerUserId: string;
  supportRoleId: string;
  approvedWorkerProfileId: string;
  approvedWorkerUserId: string;
  postId: string;
  commentId: string;
  reviewId: string;
  reportId: string;
  moderationCaseId: string;
  serviceRequestId: string;
  bookingId: string;
  supportTicketId: string;
  fraudSignalId: string;
  configKey: string;
  featureFlagKey: string;
}

interface PreparedRequest {
  path: string;
  body?: unknown;
  expectedStatuses?: number[];
  afterAllowed?: () => Promise<void>;
}

interface RouteCase {
  label: string;
  permission: AdminPermissionKey;
  allowedRole: Exclude<MatrixRole, "PLAIN">;
  deniedRole: MatrixRole;
  method: RequestMethod;
  prepare: (fixtures: SharedFixtures) => Promise<PreparedRequest> | PreparedRequest;
}

const buildEmail = (label: string): string => `${matrixPrefix}-${label}-${randomUUID()}@example.com`;
const buildSlug = (label: string): string =>
  `${matrixPrefix.replace(/-/g, "_")}_${label.replace(/-/g, "_")}_${randomUUID().slice(0, 8)}`;
const buildTitle = (label: string): string => `${matrixPrefix.toUpperCase()} ${label} ${randomUUID().slice(0, 8)}`;

const countDeclaredAdminRoutes = (): number => {
  const routesFile = readFileSync("src/modules/admin/admin.routes.ts", "utf8");
  return routesFile.match(/adminRoutes\.(get|post|patch|delete)\(/g)?.length ?? 0;
};

const registerUser = async (label: string, firstName = "Admin", lastName = "Matrix") => {
  const email = buildEmail(label);
  const response = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName,
    lastName
  });

  assert.equal(response.status, 201, `register ${label} should succeed`);

  return {
    email,
    userId: response.body.data.userId as string
  };
};

const loginUser = async (email: string) => {
  const response = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(response.status, 200, `login should succeed for ${email}`);

  return {
    accessToken: response.body.data.tokenPair.accessToken as string
  };
};

const elevateSessionMfa = async (accessToken: string): Promise<void> => {
  const payload = verifyAccessToken(accessToken);

  await prisma.userSession.update({
    where: { id: payload.jti },
    data: {
      mfaVerified: true,
      mfaVerifiedAt: new Date()
    }
  });
};

const createActor = async (role: MatrixRole, label: string): Promise<ActorSession> => {
  const user = await registerUser(label);

  if (role !== "PLAIN") {
    await adminRepository.assignRole(user.userId, role, user.userId);
  }

  const session = await loginUser(user.email);

  if (role !== "PLAIN") {
    await elevateSessionMfa(session.accessToken);
  }

  return {
    role,
    userId: user.userId,
    email: user.email,
    accessToken: session.accessToken
  };
};

const sendAs = async (actor: ActorSession, method: RequestMethod, path: string, body?: unknown) => {
  const requestBuilder = api[method](path).set("Authorization", `Bearer ${actor.accessToken}`);
  return body === undefined ? requestBuilder : requestBuilder.send(body as string | object | undefined);
};

const createApprovedWorkerProfile = async (label: string) => {
  const worker = await registerUser(`worker-${label}`, "Worker", "Approved");
  const profile = await prisma.workerProfile.create({
    data: {
      userId: worker.userId,
      headline: `Approved worker ${label}`,
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  await prisma.workerCertification.create({
    data: {
      workerProfileId: profile.id,
      title: `Certificate ${label}`,
      certificateUrl: `private/certifications/${label}.pdf`,
      verificationStatus: VerificationStatus.APPROVED
    }
  });

  return {
    userId: worker.userId,
    profileId: profile.id
  };
};

const createPendingWorkerProfile = async (label: string) => {
  const worker = await registerUser(`pending-worker-${label}`, "Worker", "Pending");
  const profile = await prisma.workerProfile.create({
    data: {
      userId: worker.userId,
      headline: `Pending worker ${label}`,
      verificationStatus: VerificationStatus.SUBMITTED
    }
  });

  await Promise.all([
    prisma.workerCertification.create({
      data: {
        workerProfileId: profile.id,
        title: `Pending certificate ${label}`,
        certificateUrl: `private/certifications/pending-${label}.pdf`,
        verificationStatus: VerificationStatus.SUBMITTED
      }
    }),
    prisma.workerVerificationRequest.create({
      data: {
        workerProfileId: profile.id,
        status: VerificationStatus.SUBMITTED,
        submittedAt: new Date()
      }
    })
  ]);

  return {
    userId: worker.userId,
    profileId: profile.id
  };
};

const createSupportTicket = async (openedByUserId: string, label: string) => {
  return prisma.supportTicket.create({
    data: {
      openedByUserId,
      subject: buildTitle(`Support ${label}`),
      body: `Support ticket body ${label}`,
      priority: SupportPriority.HIGH
    }
  });
};

const createServiceRequestBundle = async (customerUserId: string, workerProfileId: string, tradeCategoryId: string, label: string) => {
  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      customerUserId,
      tradeCategoryId,
      title: buildTitle(`Request ${label}`),
      description: `Need help with service request ${label}`,
      locationText: "Accra"
    }
  });

  await Promise.all([
    prisma.serviceRequestItem.create({
      data: {
        serviceRequestId: serviceRequest.id,
        label: "Inspection",
        quantity: 1
      }
    }),
    prisma.serviceRequestAssignment.create({
      data: {
        serviceRequestId: serviceRequest.id,
        workerProfileId,
        assignmentStatus: AssignmentStatus.ACCEPTED
      }
    }),
    prisma.serviceRequest.update({
      where: { id: serviceRequest.id },
      data: {
        status: RequestStatus.ACCEPTED
      }
    })
  ]);

  const booking = await prisma.booking.create({
    data: {
      serviceRequestId: serviceRequest.id,
      workerProfileId,
      customerUserId,
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
      scheduledEnd: new Date(Date.now() + 25 * 60 * 60 * 1000),
      status: BookingStatus.COMPLETED,
      completedAt: new Date()
    }
  });

  return {
    serviceRequestId: serviceRequest.id,
    bookingId: booking.id
  };
};

const createReviewTarget = async (customerUserId: string, workerProfileId: string, workerUserId: string, tradeCategoryId: string, label: string) => {
  const bundle = await createServiceRequestBundle(customerUserId, workerProfileId, tradeCategoryId, `review-${label}`);
  const review = await prisma.review.create({
    data: {
      bookingId: bundle.bookingId,
      reviewerUserId: customerUserId,
      revieweeUserId: workerUserId,
      rating: 5,
      body: `Review body ${label}`
    }
  });

  await prisma.reviewDimensionScore.create({
    data: {
      reviewId: review.id,
      dimensionKey: "quality",
      score: 5
    }
  });

  return {
    reviewId: review.id,
    bookingId: bundle.bookingId,
    serviceRequestId: bundle.serviceRequestId
  };
};

const createModerationCaseTarget = async (reporterUserId: string, label: string) => {
  const post = await prisma.post.create({
    data: {
      authorUserId: reporterUserId,
      body: `Moderation target ${label}`
    }
  });

  const report = await prisma.report.create({
    data: {
      reporterUserId,
      entityType: "post",
      entityId: post.id,
      reason: `Report reason ${label}`,
      severity: ModerationSeverity.HIGH
    }
  });

  const moderationCase = await prisma.moderationCase.create({
    data: {
      reportId: report.id,
      status: ModerationCaseStatus.OPEN
    }
  });

  return {
    postId: post.id,
    reportId: report.id,
    moderationCaseId: moderationCase.id
  };
};

const cleanupMatrixData = async (): Promise<void> => {
  await prisma.tradeCategory.deleteMany({
    where: {
      slug: {
        startsWith: matrixPrefix
      }
    }
  });

  await prisma.cityConfig.deleteMany({
    where: {
      slug: {
        startsWith: matrixPrefix
      }
    }
  });

  await prisma.systemConfig.deleteMany({
    where: {
      configKey: {
        startsWith: matrixPrefix
      }
    }
  });

  await prisma.featureFlag.deleteMany({
    where: {
      flagKey: {
        startsWith: matrixPrefix
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: matrixPrefix
      }
    }
  });
};

const createSharedFixtures = async (): Promise<SharedFixtures> => {
  await adminRepository.ensureCatalog();

  const actors = {
    SUPER_ADMIN: await createActor("SUPER_ADMIN", "super-admin"),
    ADMIN: await createActor("ADMIN", "admin"),
    MODERATOR: await createActor("MODERATOR", "moderator"),
    SUPPORT: await createActor("SUPPORT", "support"),
    PLAIN: await createActor("PLAIN", "plain")
  } satisfies Record<MatrixRole, ActorSession>;

  const subjectUser = await registerUser("subject", "Subject", "User");
  const customer = await registerUser("customer", "Customer", "User");
  const approvedWorker = await createApprovedWorkerProfile("shared");

  const [supportRole, city, tradeCategory] = await Promise.all([
    adminRepository.getRoleByKey(AdminRoleKey.SUPPORT),
    prisma.cityConfig.create({
      data: {
        slug: buildSlug("city"),
        name: "Accra",
        countryCode: "GH",
        currencyCode: "GHS",
        timezone: "Africa/Accra",
        defaultSearchRadiusKm: 12,
        isEnabled: true
      }
    }),
    prisma.tradeCategory.create({
      data: {
        slug: buildSlug("trade"),
        name: "Electrical"
      }
    })
  ]);

  assert.ok(supportRole, "support role should exist");

  await prisma.userProfile.update({
    where: { userId: customer.userId },
    data: {
      cityId: city.id
    }
  });

  const post = await prisma.post.create({
    data: {
      authorUserId: customer.userId,
      body: "Shared admin matrix post"
    }
  });

  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      authorUserId: approvedWorker.userId,
      body: "Shared admin matrix comment"
    }
  });

  const requestBundle = await createServiceRequestBundle(customer.userId, approvedWorker.profileId, tradeCategory.id, "shared");
  const reviewTarget = await createReviewTarget(customer.userId, approvedWorker.profileId, approvedWorker.userId, tradeCategory.id, "shared");

  const report = await prisma.report.create({
    data: {
      reporterUserId: customer.userId,
      entityType: "post",
      entityId: post.id,
      reason: "Shared admin matrix report",
      severity: ModerationSeverity.HIGH
    }
  });

  const moderationCase = await prisma.moderationCase.create({
    data: {
      reportId: report.id,
      assignedAdminUserId: actors.ADMIN.userId,
      status: ModerationCaseStatus.OPEN
    }
  });

  const [supportTicket, fraudSignal] = await Promise.all([
    createSupportTicket(customer.userId, "shared"),
    prisma.fraudSignal.create({
      data: {
        userId: customer.userId,
        signalKey: buildSlug("signal").toUpperCase(),
        score: 82
      }
    })
  ]);

  const [, , config, featureFlag] = await Promise.all([
    prisma.analyticsEvent.create({
      data: {
        userId: customer.userId,
        eventName: "admin_matrix_shared_event",
        propsJson: {
          source: "admin-role-matrix"
        }
      }
    }),
    prisma.searchImpression.create({
      data: {
        userId: customer.userId,
        queryText: "electrician",
        workerProfileId: approvedWorker.profileId,
        rankPosition: 1,
        cityId: city.id
      }
    }),
    prisma.systemConfig.create({
      data: {
        configKey: buildSlug("config"),
        valueJson: {
          enabled: true
        }
      }
    }),
    prisma.featureFlag.create({
      data: {
        flagKey: buildSlug("flag"),
        defaultEnabled: false,
        description: "Shared admin matrix flag"
      }
    })
  ]);

  return {
    actors,
    cityId: city.id,
    tradeCategoryId: tradeCategory.id,
    subjectUserId: subjectUser.userId,
    customerUserId: customer.userId,
    supportRoleId: supportRole.id,
    approvedWorkerProfileId: approvedWorker.profileId,
    approvedWorkerUserId: approvedWorker.userId,
    postId: post.id,
    commentId: comment.id,
    reviewId: reviewTarget.reviewId,
    reportId: report.id,
    moderationCaseId: moderationCase.id,
    serviceRequestId: requestBundle.serviceRequestId,
    bookingId: requestBundle.bookingId,
    supportTicketId: supportTicket.id,
    fraudSignalId: fraudSignal.id,
    configKey: config.configKey,
    featureFlagKey: featureFlag.flagKey
  };
};

const createRouteCases = (fixtures: SharedFixtures): RouteCase[] => [
  {
    label: "list users",
    permission: "USER_VIEW",
    allowedRole: "SUPPORT",
    deniedRole: "PLAIN",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/users?page=1&limit=20" })
  },
  {
    label: "get user",
    permission: "USER_VIEW",
    allowedRole: "SUPPORT",
    deniedRole: "PLAIN",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/users/${fixtures.subjectUserId}` })
  },
  {
    label: "suspend user",
    permission: "USER_SUSPEND",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: async () => {
      const target = await registerUser("suspend-target", "Suspend", "Target");

      return {
        path: `/api/v1/admin/users/${target.userId}/suspend`,
        body: {
          reason: "Suspended by role matrix test"
        },
        afterAllowed: async () => {
          const updatedUser = await prisma.user.findUniqueOrThrow({
            where: { id: target.userId },
            select: { status: true }
          });
          assert.equal(updatedUser.status, UserStatus.SUSPENDED);
        }
      };
    }
  },
  {
    label: "reactivate user",
    permission: "USER_REACTIVATE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: async () => {
      const target = await registerUser("reactivate-target", "Reactivate", "Target");
      await prisma.user.update({
        where: { id: target.userId },
        data: {
          status: UserStatus.SUSPENDED
        }
      });

      return {
        path: `/api/v1/admin/users/${target.userId}/reactivate`,
        body: {
          notes: "Reactivated by role matrix test"
        },
        afterAllowed: async () => {
          const updatedUser = await prisma.user.findUniqueOrThrow({
            where: { id: target.userId },
            select: { status: true }
          });
          assert.equal(updatedUser.status, UserStatus.ACTIVE);
        }
      };
    }
  },
  {
    label: "revoke single session",
    permission: "USER_SESSION_REVOKE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: async () => {
      const target = await registerUser("revoke-session-target", "Session", "Target");
      const login = await loginUser(target.email);
      const payload = verifyAccessToken(login.accessToken);

      return {
        path: `/api/v1/admin/users/${target.userId}/sessions/${payload.jti}/revoke`,
        afterAllowed: async () => {
          const meResponse = await api.get("/api/v1/auth/me").set("Authorization", `Bearer ${login.accessToken}`);
          assert.equal(meResponse.status, 401);
        }
      };
    }
  },
  {
    label: "revoke all sessions",
    permission: "USER_SESSION_REVOKE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: async () => {
      const target = await registerUser("revoke-all-target", "Session", "All");
      const firstLogin = await loginUser(target.email);
      await loginUser(target.email);

      return {
        path: `/api/v1/admin/users/${target.userId}/sessions/revoke-all`,
        afterAllowed: async () => {
          const meResponse = await api.get("/api/v1/auth/me").set("Authorization", `Bearer ${firstLogin.accessToken}`);
          assert.equal(meResponse.status, 401);
        }
      };
    }
  },
  {
    label: "list workers",
    permission: "WORKER_VIEW",
    allowedRole: "SUPPORT",
    deniedRole: "PLAIN",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/workers?page=1&limit=20" })
  },
  {
    label: "get worker",
    permission: "WORKER_VIEW",
    allowedRole: "SUPPORT",
    deniedRole: "PLAIN",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/workers/${fixtures.approvedWorkerProfileId}` })
  },
  {
    label: "verify worker",
    permission: "WORKER_VERIFY",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: async () => {
      const worker = await createPendingWorkerProfile("verify");

      return {
        path: `/api/v1/admin/workers/${worker.profileId}/verify`,
        body: {
          notes: "Verified by role matrix test"
        },
        afterAllowed: async () => {
          const profile = await prisma.workerProfile.findUniqueOrThrow({
            where: { id: worker.profileId },
            select: { verificationStatus: true }
          });
          assert.equal(profile.verificationStatus, VerificationStatus.APPROVED);
        }
      };
    }
  },
  {
    label: "reject worker verification",
    permission: "WORKER_REJECT_VERIFICATION",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: async () => {
      const worker = await createPendingWorkerProfile("reject");

      return {
        path: `/api/v1/admin/workers/${worker.profileId}/reject-verification`,
        body: {
          reviewNotes: "Rejected by role matrix test"
        },
        afterAllowed: async () => {
          const profile = await prisma.workerProfile.findUniqueOrThrow({
            where: { id: worker.profileId },
            select: { verificationStatus: true }
          });
          assert.equal(profile.verificationStatus, VerificationStatus.REJECTED);
        }
      };
    }
  },
  {
    label: "view verification documents",
    permission: "WORKER_VERIFY",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/workers/${fixtures.approvedWorkerProfileId}/verification-documents` })
  },
  {
    label: "get worker subscription",
    permission: "FEATURED_WORKER_MANAGE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/workers/${fixtures.approvedWorkerProfileId}/subscription` })
  },
  {
    label: "update worker subscription",
    permission: "FEATURED_WORKER_MANAGE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: async () => {
      const worker = await createApprovedWorkerProfile("subscription-action");

      return {
        path: `/api/v1/admin/workers/${worker.profileId}/subscription`,
        body: {
          action: "ENABLE",
          notes: "Enable featured placement"
        },
        afterAllowed: async () => {
          const profile = await prisma.workerProfile.findUniqueOrThrow({
            where: { id: worker.profileId },
            select: { isFeatured: true }
          });
          assert.equal(profile.isFeatured, true);
        }
      };
    }
  },
  {
    label: "list posts",
    permission: "POST_DELETE",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/posts?page=1&limit=20" })
  },
  {
    label: "delete post",
    permission: "POST_DELETE",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "delete",
    prepare: async () => {
      const post = await prisma.post.create({
        data: {
          authorUserId: fixtures.customerUserId,
          body: "Delete post target"
        }
      });

      return {
        path: `/api/v1/admin/posts/${post.id}`
      };
    }
  },
  {
    label: "delete comment",
    permission: "COMMENT_DELETE",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "delete",
    prepare: async () => {
      const post = await prisma.post.create({
        data: {
          authorUserId: fixtures.customerUserId,
          body: "Delete comment post target"
        }
      });
      const comment = await prisma.comment.create({
        data: {
          postId: post.id,
          authorUserId: fixtures.approvedWorkerUserId,
          body: "Delete comment target"
        }
      });

      return {
        path: `/api/v1/admin/comments/${comment.id}`
      };
    }
  },
  {
    label: "delete review",
    permission: "REVIEW_DELETE",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "delete",
    prepare: async () => {
      const review = await createReviewTarget(
        fixtures.customerUserId,
        fixtures.approvedWorkerProfileId,
        fixtures.approvedWorkerUserId,
        fixtures.tradeCategoryId,
        "delete"
      );

      return {
        path: `/api/v1/admin/reviews/${review.reviewId}`
      };
    }
  },
  {
    label: "list reports",
    permission: "REPORT_VIEW",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/reports?page=1&limit=20" })
  },
  {
    label: "get report",
    permission: "REPORT_VIEW",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/reports/${fixtures.reportId}` })
  },
  {
    label: "export reports",
    permission: "REPORT_VIEW",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/reports/export?status=OPEN" })
  },
  {
    label: "bulk update reports",
    permission: "REPORT_UPDATE",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "patch",
    prepare: async () => {
      const firstReport = await prisma.report.create({
        data: {
          reporterUserId: fixtures.customerUserId,
          entityType: "post",
          entityId: randomUUID(),
          reason: buildTitle("Bulk Report A"),
          severity: ModerationSeverity.HIGH
        }
      });
      const secondReport = await prisma.report.create({
        data: {
          reporterUserId: fixtures.customerUserId,
          entityType: "comment",
          entityId: randomUUID(),
          reason: buildTitle("Bulk Report B"),
          severity: ModerationSeverity.MEDIUM
        }
      });

      return {
        path: "/api/v1/admin/reports/bulk",
        body: {
          reportIds: [firstReport.id, secondReport.id],
          status: "UNDER_REVIEW",
          notes: "Bulk triage from role matrix test"
        },
        afterAllowed: async () => {
          const updatedReports = await prisma.report.findMany({
            where: {
              id: {
                in: [firstReport.id, secondReport.id]
              }
            },
            select: {
              status: true
            }
          });
          assert.equal(updatedReports.length, 2);
          assert.equal(updatedReports.every((report) => report.status === "UNDER_REVIEW"), true);
        }
      };
    }
  },
  {
    label: "list moderation cases",
    permission: "REPORT_VIEW",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/moderation-cases?page=1&limit=20" })
  },
  {
    label: "get moderation case",
    permission: "REPORT_VIEW",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/moderation-cases/${fixtures.moderationCaseId}` })
  },
  {
    label: "export moderation cases",
    permission: "REPORT_VIEW",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/moderation-cases/export?status=OPEN" })
  },
  {
    label: "add moderation action",
    permission: "MODERATION_CASE_ACTION",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "post",
    prepare: async () => {
      const target = await createModerationCaseTarget(fixtures.customerUserId, "action");

      return {
        path: `/api/v1/admin/moderation-cases/${target.moderationCaseId}/actions`,
        body: {
          actionType: "DISMISS_REPORT",
          entityType: "post",
          entityId: target.postId,
          notes: "Matrix moderation action"
        },
        expectedStatuses: [201]
      };
    }
  },
  {
    label: "bulk moderation actions",
    permission: "MODERATION_CASE_ACTION",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "post",
    prepare: async () => {
      const firstTarget = await createModerationCaseTarget(fixtures.customerUserId, "bulk-a");
      const secondTarget = await createModerationCaseTarget(fixtures.customerUserId, "bulk-b");

      return {
        path: "/api/v1/admin/moderation-cases/bulk-actions",
        body: {
          caseIds: [firstTarget.moderationCaseId, secondTarget.moderationCaseId],
          actionType: "ESCALATE_REVIEW",
          notes: "Bulk moderation action from matrix test"
        },
        afterAllowed: async () => {
          const updatedCases = await prisma.moderationCase.findMany({
            where: {
              id: {
                in: [firstTarget.moderationCaseId, secondTarget.moderationCaseId]
              }
            },
            select: {
              status: true
            }
          });
          assert.equal(updatedCases.length, 2);
          assert.equal(updatedCases.every((moderationCase) => moderationCase.status === ModerationCaseStatus.IN_REVIEW), true);
        }
      };
    }
  },
  {
    label: "list support tickets",
    permission: "SUPPORT_TICKET_VIEW",
    allowedRole: "SUPPORT",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/support-tickets?page=1&limit=20" })
  },
  {
    label: "export support tickets",
    permission: "SUPPORT_TICKET_VIEW",
    allowedRole: "SUPPORT",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/support-tickets/export?status=OPEN" })
  },
  {
    label: "get support ticket detail",
    permission: "SUPPORT_TICKET_VIEW",
    allowedRole: "SUPPORT",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/support-tickets/${fixtures.supportTicketId}` })
  },
  {
    label: "add support ticket message",
    permission: "SUPPORT_TICKET_RESPOND",
    allowedRole: "SUPPORT",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: async () => {
      const ticket = await createSupportTicket(fixtures.customerUserId, "reply");

      return {
        path: `/api/v1/admin/support-tickets/${ticket.id}/messages`,
        body: {
          body: "Role matrix support reply",
          isInternalNote: true
        },
        afterAllowed: async () => {
          const messages = await prisma.supportTicketMessage.findMany({
            where: {
              supportTicketId: ticket.id
            },
            orderBy: {
              createdAt: "asc"
            },
            select: {
              body: true,
              isInternalNote: true
            }
          });
          assert.equal(messages.some((message) => message.isInternalNote && message.body === "Role matrix support reply"), true);
        }
      };
    }
  },
  {
    label: "assign support ticket",
    permission: "SUPPORT_TICKET_ASSIGN",
    allowedRole: "SUPPORT",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: async () => {
      const ticket = await createSupportTicket(fixtures.customerUserId, "assign");

      return {
        path: `/api/v1/admin/support-tickets/${ticket.id}/assign`,
        body: {
          assignedSupportUserId: fixtures.actors.SUPPORT.userId
        }
      };
    }
  },
  {
    label: "update support ticket status",
    permission: "SUPPORT_TICKET_ASSIGN",
    allowedRole: "SUPPORT",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: async () => {
      const ticket = await createSupportTicket(fixtures.customerUserId, "status");

      return {
        path: `/api/v1/admin/support-tickets/${ticket.id}/status`,
        body: {
          status: "WAITING_USER"
        }
      };
    }
  },
  {
    label: "bulk update support tickets",
    permission: "SUPPORT_TICKET_ASSIGN",
    allowedRole: "SUPPORT",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: async () => {
      const firstTicket = await createSupportTicket(fixtures.customerUserId, "bulk-a");
      const secondTicket = await createSupportTicket(fixtures.customerUserId, "bulk-b");

      return {
        path: "/api/v1/admin/support-tickets/bulk",
        body: {
          ticketIds: [firstTicket.id, secondTicket.id],
          assignedSupportUserId: fixtures.actors.SUPPORT.userId,
          status: "WAITING_USER"
        },
        afterAllowed: async () => {
          const updatedTickets = await prisma.supportTicket.findMany({
            where: {
              id: {
                in: [firstTicket.id, secondTicket.id]
              }
            },
            select: {
              status: true,
              assignedSupportUserId: true
            }
          });
          assert.equal(updatedTickets.length, 2);
          assert.equal(updatedTickets.every((ticket) => ticket.status === "WAITING_USER"), true);
          assert.equal(updatedTickets.every((ticket) => ticket.assignedSupportUserId === fixtures.actors.SUPPORT.userId), true);
        }
      };
    }
  },
  {
    label: "list audit logs",
    permission: "AUDIT_LOG_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/audit-logs?page=1&limit=20" })
  },
  {
    label: "export audit logs",
    permission: "AUDIT_LOG_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/audit-logs/export?action=USER_SUSPENDED" })
  },
  {
    label: "analytics overview",
    permission: "ANALYTICS_VIEW_OVERVIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/analytics/overview" })
  },
  {
    label: "analytics search",
    permission: "ANALYTICS_VIEW_SEARCH",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/analytics/search" })
  },
  {
    label: "analytics engagement",
    permission: "ANALYTICS_VIEW_ENGAGEMENT",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/analytics/engagement" })
  },
  {
    label: "analytics marketplace",
    permission: "ANALYTICS_VIEW_MARKETPLACE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/analytics/marketplace" })
  },
  {
    label: "list configs",
    permission: "CONFIG_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/configs" })
  },
  {
    label: "update config",
    permission: "CONFIG_UPDATE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: () => ({
      path: `/api/v1/admin/configs/${fixtures.configKey}`,
      body: {
        value: {
          enabled: false,
          source: "role-matrix"
        }
      }
    })
  },
  {
    label: "list feature flags",
    permission: "FEATURE_FLAG_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/feature-flags" })
  },
  {
    label: "update feature flag",
    permission: "FEATURE_FLAG_UPDATE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: () => ({
      path: `/api/v1/admin/feature-flags/${fixtures.featureFlagKey}`,
      body: {
        defaultEnabled: true,
        rolloutJson: {
          percentage: 100
        }
      }
    })
  },
  {
    label: "list cities",
    permission: "CITY_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/cities?page=1&limit=20" })
  },
  {
    label: "create city",
    permission: "CITY_CREATE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: () => ({
      path: "/api/v1/admin/cities",
      body: {
        slug: buildSlug("created_city"),
        name: "Kumasi",
        countryCode: "GH",
        currencyCode: "GHS",
        timezone: "Africa/Accra",
        defaultSearchRadiusKm: 15,
        isEnabled: true
      },
      expectedStatuses: [201]
    })
  },
  {
    label: "update city",
    permission: "CITY_UPDATE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: async () => {
      const city = await prisma.cityConfig.create({
        data: {
          slug: buildSlug("update_city"),
          name: "Tema",
          countryCode: "GH",
          currencyCode: "GHS",
          timezone: "Africa/Accra",
          defaultSearchRadiusKm: 10,
          isEnabled: true
        }
      });

      return {
        path: `/api/v1/admin/cities/${city.id}`,
        body: {
          isEnabled: false,
          defaultSearchRadiusKm: 20
        }
      };
    }
  },
  {
    label: "list roles",
    permission: "ROLE_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/roles" })
  },
  {
    label: "list permissions",
    permission: "PERMISSION_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/permissions" })
  },
  {
    label: "update role permissions",
    permission: "ROLE_PERMISSION_UPDATE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: () => ({
      path: `/api/v1/admin/roles/${fixtures.supportRoleId}/permissions`,
      body: {
        permissionKeys: DEFAULT_ROLE_PERMISSION_KEYS.SUPPORT
      }
    })
  },
  {
    label: "assign admin role",
    permission: "ADMIN_ROLE_ASSIGN",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: async () => {
      const target = await registerUser("assign-role-target", "Assign", "Role");

      return {
        path: `/api/v1/admin/users/${target.userId}/roles`,
        body: {
          roleKey: "SUPPORT"
        }
      };
    }
  },
  {
    label: "remove admin role",
    permission: "ADMIN_ROLE_REMOVE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "delete",
    prepare: async () => {
      const target = await registerUser("remove-role-target", "Remove", "Role");
      await adminRepository.assignRole(target.userId, AdminRoleKey.SUPPORT, fixtures.actors.SUPER_ADMIN.userId);

      return {
        path: `/api/v1/admin/users/${target.userId}/roles/${fixtures.supportRoleId}`
      };
    }
  },
  {
    label: "list service requests",
    permission: "SERVICE_REQUEST_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/service-requests?page=1&limit=20" })
  },
  {
    label: "get service request",
    permission: "SERVICE_REQUEST_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/service-requests/${fixtures.serviceRequestId}` })
  },
  {
    label: "list bookings",
    permission: "BOOKING_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/bookings?page=1&limit=20" })
  },
  {
    label: "get booking",
    permission: "BOOKING_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/bookings/${fixtures.bookingId}` })
  },
  {
    label: "list featured workers",
    permission: "FEATURED_WORKER_MANAGE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/featured-workers?page=1&limit=20" })
  },
  {
    label: "action featured worker",
    permission: "FEATURED_WORKER_MANAGE",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: async () => {
      const worker = await createApprovedWorkerProfile("featured-action");

      return {
        path: `/api/v1/admin/featured-workers/${worker.profileId}`,
        body: {
          action: "ENABLE",
          notes: "Feature worker in matrix test"
        }
      };
    }
  },
  {
    label: "list fraud signals",
    permission: "FRAUD_SIGNAL_VIEW",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/fraud-signals?page=1&limit=20" })
  },
  {
    label: "export fraud signals",
    permission: "FRAUD_SIGNAL_VIEW",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/fraud-signals/export?status=OPEN" })
  },
  {
    label: "action fraud signal",
    permission: "FRAUD_SIGNAL_ACTION",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: async () => {
      const signal = await prisma.fraudSignal.create({
        data: {
          userId: fixtures.customerUserId,
          signalKey: buildSlug("action_signal").toUpperCase(),
          score: 91
        }
      });

      return {
        path: `/api/v1/admin/fraud-signals/${signal.id}`,
        body: {
          action: "REVIEW"
        }
      };
    }
  },
  {
    label: "bulk fraud signal action",
    permission: "FRAUD_SIGNAL_ACTION",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "patch",
    prepare: async () => {
      const firstSignal = await prisma.fraudSignal.create({
        data: {
          userId: fixtures.customerUserId,
          signalKey: buildSlug("bulk_signal_a").toUpperCase(),
          score: 88
        }
      });
      const secondSignal = await prisma.fraudSignal.create({
        data: {
          userId: fixtures.customerUserId,
          signalKey: buildSlug("bulk_signal_b").toUpperCase(),
          score: 90
        }
      });

      return {
        path: "/api/v1/admin/fraud-signals/bulk",
        body: {
          signalIds: [firstSignal.id, secondSignal.id],
          action: "DISMISS",
          notes: "Bulk fraud dismiss from matrix test"
        },
        afterAllowed: async () => {
          const updatedSignals = await prisma.fraudSignal.findMany({
            where: {
              id: {
                in: [firstSignal.id, secondSignal.id]
              }
            },
            select: {
              status: true
            }
          });
          assert.equal(updatedSignals.length, 2);
          assert.equal(updatedSignals.every((signal) => signal.status === FraudSignalStatus.DISMISSED), true);
        }
      };
    }
  },
  {
    label: "content viewer",
    permission: "CONTENT_VIEW",
    allowedRole: "MODERATOR",
    deniedRole: "SUPPORT",
    method: "get",
    prepare: () => ({ path: `/api/v1/admin/content/post/${fixtures.postId}` })
  },
  {
    label: "system health",
    permission: "SYSTEM_HEALTH_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/system/health" })
  },
  {
    label: "system metrics",
    permission: "SYSTEM_HEALTH_VIEW",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "get",
    prepare: () => ({ path: "/api/v1/admin/system/metrics" })
  },
  {
    label: "broadcast notification",
    permission: "NOTIFICATION_BROADCAST",
    allowedRole: "SUPER_ADMIN",
    deniedRole: "MODERATOR",
    method: "post",
    prepare: () => ({
      path: "/api/v1/admin/notifications/broadcast",
      body: {
        targetAudience: "ALL_USERS",
        title: buildTitle("Broadcast"),
        body: "This is a matrix broadcast notification body.",
        channel: NotificationChannel.IN_APP
      },
      expectedStatuses: [201]
    })
  }
];

before(async () => {
  await cleanupMatrixData();
  await adminRepository.ensureCatalog();
});

after(async () => {
  await cleanupMatrixData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test(
  "admin role matrix covers every admin route with one allowed actor and one denied actor",
  { concurrency: false },
  async () => {
    const fixtures = await createSharedFixtures();
    const routeCases = createRouteCases(fixtures);

    assert.equal(routeCases.length, countDeclaredAdminRoutes(), "route matrix must match the declared admin route count");

    for (const routeCase of routeCases) {
      const prepared = await routeCase.prepare(fixtures);
      const deniedActor = fixtures.actors[routeCase.deniedRole];
      const allowedActor = fixtures.actors[routeCase.allowedRole];

      const deniedResponse = await sendAs(deniedActor, routeCase.method, prepared.path, prepared.body);
      assert.equal(
        deniedResponse.status,
        403,
        `${routeCase.label}: ${routeCase.deniedRole} should be denied for ${routeCase.permission}`
      );
      assert.equal(
        deniedResponse.body.error.code,
        "PERMISSION_DENIED",
        `${routeCase.label}: ${routeCase.deniedRole} should fail with PERMISSION_DENIED`
      );

      const allowedResponse = await sendAs(allowedActor, routeCase.method, prepared.path, prepared.body);
      assert.ok(
        (prepared.expectedStatuses ?? [200, 201]).includes(allowedResponse.status),
        `${routeCase.label}: ${routeCase.allowedRole} should be allowed for ${routeCase.permission}, got ${allowedResponse.status}`
      );

      if (prepared.afterAllowed) {
        await prepared.afterAllowed();
      }
    }
  }
);
