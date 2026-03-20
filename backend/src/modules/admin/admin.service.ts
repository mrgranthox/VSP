import {
  AdminRoleKey,
  BookingStatus,
  FraudSignalStatus,
  ModerationCaseStatus,
  PaymentIntentStatus,
  Prisma,
  RequestStatus,
  SubscriptionStatus,
  SupportTicketStatus,
  UserStatus,
  VerificationStatus
} from "@prisma/client";

import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import { prisma } from "../../lib/prisma";
import { publicUserSelect } from "../../lib/public-user-select";
import { redis } from "../../lib/redis";
import { Errors } from "../../lib/errors";
import { isTypesenseConfigured, typesenseClient, typesenseWorkersCollection } from "../../lib/typesense";
import type { ActorContext } from "../../types/actor";
import { NotificationsService } from "../notifications/notifications.service";
import { SupportService } from "../support/support.service";
import { WorkerProfilesService } from "../worker-profiles/worker-profiles.service";
import { AdminRepository } from "./admin.repository";
import type { AdminPermissionKey } from "./admin.permissions";

const DEFAULT_FEATURED_EXTENSION_DAYS = 30;

const toJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const getDisplayName = (profile: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null | undefined): string | null =>
  profile?.displayName ?? ([profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || null);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

class AdminService {
  constructor(
    private readonly repository: AdminRepository = new AdminRepository(),
    private readonly supportService: SupportService = new SupportService(),
    private readonly notificationsService: NotificationsService = new NotificationsService(),
    private readonly workerProfilesService: WorkerProfilesService = new WorkerProfilesService()
  ) {}

  private buildDateRangeWhere(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    const where: Prisma.DateTimeFilter = {};

    if (from) {
      where.gte = new Date(from);
    }

    if (to) {
      where.lte = new Date(to);
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }

  private async audit(
    actor: ActorContext,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.repository.writeAdminAuditLog(actor.userId, action, entityType, entityId, metadata);
  }

  private async requireUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        workerProfile: {
          include: {
            tradeCategories: {
              include: {
                tradeCategory: true
              }
            }
          }
        },
        adminAssignments: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw Errors.USER_NOT_FOUND();
    }

    return user;
  }

  private async requireWorker(workerId: string) {
    const worker = await prisma.workerProfile.findUnique({
      where: { id: workerId },
      include: {
        user: {
          select: publicUserSelect
        },
        tradeCategories: {
          include: {
            tradeCategory: true
          }
        },
        services: true,
        serviceAreas: {
          include: {
            city: true
          }
        },
        certifications: true,
        verificationRequests: {
          orderBy: {
            createdAt: "desc"
          }
        },
        featuredSubscriptions: {
          orderBy: {
            endsAt: "desc"
          }
        },
        subscriptionInvoices: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!worker) {
      throw Errors.WORKER_PROFILE_NOT_FOUND();
    }

    return worker;
  }

  private mapUserSummary(user: {
    id: string;
    email: string | null;
    phone: string | null;
    status: UserStatus;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    profile: {
      id: string;
      firstName: string;
      lastName: string;
      displayName: string | null;
      avatarUrl: string | null;
      cityId: string | null;
    } | null;
    workerProfile: {
      id: string;
      verificationStatus: VerificationStatus;
      isFeatured: boolean;
    } | null;
    adminAssignments: Array<{
      role: {
        roleKey: AdminRoleKey;
      };
    }>;
  }) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            id: user.profile.id,
            displayName: getDisplayName(user.profile),
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            avatarUrl: user.profile.avatarUrl,
            cityId: user.profile.cityId
          }
        : null,
      workerProfile: user.workerProfile
        ? {
            id: user.workerProfile.id,
            verificationStatus: user.workerProfile.verificationStatus,
            isFeatured: user.workerProfile.isFeatured
          }
        : null,
      roles: user.adminAssignments.map((assignment) => assignment.role.roleKey)
    };
  }

  async listUsers(
    query: {
      status?: UserStatus;
      q?: string;
      cityId?: string;
    },
    pagination: PaginationInput
  ) {
    const args = getPaginationArgs(pagination);
    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.cityId
        ? {
            profile: {
              is: {
                cityId: query.cityId
              }
            }
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q } },
              { phone: { contains: query.q } },
              { profile: { is: { firstName: { contains: query.q } } } },
              { profile: { is: { lastName: { contains: query.q } } } },
              { profile: { is: { displayName: { contains: query.q } } } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          workerProfile: true,
          adminAssignments: {
            include: {
              role: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: args.skip,
        take: args.take
      }),
      prisma.user.count({ where })
    ]);

    return {
      data: items.map((item) => this.mapUserSummary(item)),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.requireUser(userId);
    const [sessionCount, openTicketCount] = await Promise.all([
      prisma.userSession.count({
        where: {
          userId,
          revokedAt: null,
          expiresAt: {
            gt: new Date()
          }
        }
      }),
      prisma.supportTicket.count({
        where: {
          openedByUserId: userId,
          status: {
            in: [SupportTicketStatus.OPEN, SupportTicketStatus.ASSIGNED, SupportTicketStatus.WAITING_INTERNAL, SupportTicketStatus.WAITING_USER]
          }
        }
      })
    ]);

    return {
      ...this.mapUserSummary(user),
      sessionCount,
      openTicketCount
    };
  }

  async suspendUser(actor: ActorContext, userId: string, data: { reason: string }) {
    await this.requireUser(userId);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.SUSPENDED
        }
      });

      await tx.userSession.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    });

    await this.audit(actor, "USER_SUSPENDED", "user", userId, { reason: data.reason });
  }

  async reactivateUser(actor: ActorContext, userId: string, data: { notes?: string }) {
    await this.requireUser(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE
      }
    });

    await this.audit(actor, "USER_REACTIVATED", "user", userId, { notes: data.notes ?? null });
  }

  async listWorkers(
    query: {
      verificationStatus?: VerificationStatus;
      q?: string;
    },
    pagination: PaginationInput
  ) {
    const args = getPaginationArgs(pagination);
    const where: Prisma.WorkerProfileWhereInput = {
      ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
      ...(query.q
        ? {
            OR: [
              { headline: { contains: query.q } },
              { user: { profile: { is: { firstName: { contains: query.q } } } } },
              { user: { profile: { is: { lastName: { contains: query.q } } } } },
              { user: { profile: { is: { displayName: { contains: query.q } } } } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.workerProfile.findMany({
        where,
        include: {
          user: {
            include: {
              profile: true
            }
          },
          tradeCategories: {
            include: {
              tradeCategory: true
            }
          },
          featuredSubscriptions: {
            orderBy: {
              endsAt: "desc"
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: args.skip,
        take: args.take
      }),
      prisma.workerProfile.count({ where })
    ]);

    return {
      data: items.map((worker) => ({
        id: worker.id,
        userId: worker.userId,
        displayName: getDisplayName(worker.user.profile),
        headline: worker.headline,
        verificationStatus: worker.verificationStatus,
        isFeatured: worker.isFeatured,
        avgRating: worker.avgRating,
        totalReviews: worker.totalReviews,
        trades: worker.tradeCategories.map((trade) => trade.tradeCategory.name),
        latestSubscription: worker.featuredSubscriptions[0] ?? null
      })),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getWorkerDetail(workerId: string) {
    return this.requireWorker(workerId);
  }

  async verifyWorker(actor: ActorContext, workerId: string, data: { notes?: string }) {
    await this.requireWorker(workerId);

    await prisma.$transaction(async (tx) => {
      await tx.workerProfile.update({
        where: { id: workerId },
        data: {
          verificationStatus: VerificationStatus.APPROVED
        }
      });

      await tx.workerVerificationRequest.updateMany({
        where: {
          workerProfileId: workerId,
          status: {
            in: [VerificationStatus.SUBMITTED, VerificationStatus.UNDER_REVIEW]
          }
        },
        data: {
          status: VerificationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewNotes: data.notes
        }
      });
    });

    await this.audit(actor, "WORKER_VERIFIED", "worker_profile", workerId, { notes: data.notes ?? null });
  }

  async rejectWorker(actor: ActorContext, workerId: string, data: { reviewNotes: string }) {
    await this.requireWorker(workerId);

    await prisma.$transaction(async (tx) => {
      await tx.workerProfile.update({
        where: { id: workerId },
        data: {
          verificationStatus: VerificationStatus.REJECTED
        }
      });

      await tx.workerVerificationRequest.updateMany({
        where: {
          workerProfileId: workerId,
          status: {
            in: [VerificationStatus.SUBMITTED, VerificationStatus.UNDER_REVIEW]
          }
        },
        data: {
          status: VerificationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewNotes: data.reviewNotes
        }
      });
    });

    await this.audit(actor, "WORKER_VERIFICATION_REJECTED", "worker_profile", workerId, { reviewNotes: data.reviewNotes });
  }

  async listPosts(query: { q?: string; isDeleted?: boolean }, pagination: PaginationInput) {
    const args = getPaginationArgs(pagination);
    const where: Prisma.PostWhereInput = {
      ...(query.q ? { body: { contains: query.q } } : {}),
      ...(query.isDeleted !== undefined ? { isDeleted: query.isDeleted } : {})
    };

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          authorUser: {
            include: {
              profile: true
            }
          },
          media: true,
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: args.skip,
        take: args.take
      }),
      prisma.post.count({ where })
    ]);

    return {
      data: items.map((post) => ({
        id: post.id,
        authorUserId: post.authorUserId,
        authorDisplayName: getDisplayName(post.authorUser.profile),
        body: post.body,
        visibility: post.visibility,
        isDeleted: post.isDeleted,
        createdAt: post.createdAt,
        mediaCount: post.media.length,
        likeCount: post._count.likes,
        commentCount: post._count.comments
      })),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async deletePost(actor: ActorContext, postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true }
    });

    if (!post) {
      throw Errors.POST_NOT_FOUND();
    }

    if (!post.isDeleted) {
      await prisma.post.update({
        where: { id: postId },
        data: {
          isDeleted: true
        }
      });
    }

    await this.audit(actor, "POST_DELETED", "post", postId);
  }

  async deleteComment(actor: ActorContext, commentId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, isDeleted: true }
    });

    if (!comment) {
      throw Errors.COMMENT_NOT_FOUND();
    }

    if (!comment.isDeleted) {
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          isDeleted: true
        }
      });
    }

    await this.audit(actor, "COMMENT_DELETED", "comment", commentId);
  }

  async deleteReview(actor: ActorContext, reviewId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        booking: {
          select: {
            workerProfileId: true
          }
        }
      }
    });

    if (!review) {
      throw Errors.REVIEW_NOT_FOUND();
    }

    await prisma.review.delete({
      where: { id: reviewId }
    });

    await this.workerProfilesService.recalculateAggregates(review.booking.workerProfileId);
    await this.audit(actor, "REVIEW_DELETED", "review", reviewId);
  }

  async listReports(
    query: {
      status?: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
      entityType?: string;
      severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    },
    pagination: PaginationInput
  ) {
    const args = getPaginationArgs(pagination);
    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.severity ? { severity: query.severity } : {})
    };

    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporterUser: {
            select: publicUserSelect
          },
          moderationCases: {
            include: {
              actions: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: args.skip,
        take: args.take
      }),
      prisma.report.count({ where })
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getReportDetail(reportId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporterUser: {
          select: publicUserSelect
        },
        moderationCases: {
          include: {
            assignedAdminUser: {
              select: publicUserSelect
            },
            actions: {
              include: {
                performedByAdminUser: {
                  select: publicUserSelect
                }
              },
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        }
      }
    });

    if (!report) {
      throw Errors.REPORT_NOT_FOUND();
    }

    return report;
  }

  async listModerationCases(query: { status?: ModerationCaseStatus }, pagination: PaginationInput) {
    const args = getPaginationArgs(pagination);
    const where: Prisma.ModerationCaseWhereInput = {
      ...(query.status ? { status: query.status } : {})
    };

    const [items, total] = await Promise.all([
      prisma.moderationCase.findMany({
        where,
        include: {
          report: true,
          assignedAdminUser: {
            select: publicUserSelect
          },
          actions: {
            include: {
              performedByAdminUser: {
                select: publicUserSelect
              }
            },
            orderBy: {
              createdAt: "asc"
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: args.skip,
        take: args.take
      }),
      prisma.moderationCase.count({ where })
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getModerationCase(caseId: string) {
    const moderationCase = await prisma.moderationCase.findUnique({
      where: { id: caseId },
      include: {
        report: true,
        assignedAdminUser: {
          select: publicUserSelect
        },
        actions: {
          include: {
            performedByAdminUser: {
              select: publicUserSelect
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!moderationCase) {
      throw Errors.MODERATION_CASE_NOT_FOUND();
    }

    return moderationCase;
  }

  async addModerationAction(
    actor: ActorContext,
    caseId: string,
    data: { actionType: string; entityType: string; entityId: string; notes?: string }
  ) {
    const moderationCase = await this.getModerationCase(caseId);

    const normalizedAction = data.actionType.toLowerCase();
    const nextStatus =
      normalizedAction.includes("dismiss")
        ? ModerationCaseStatus.DISMISSED
        : normalizedAction.includes("review")
          ? ModerationCaseStatus.IN_REVIEW
          : ModerationCaseStatus.ACTIONED;

    await prisma.$transaction(async (tx) => {
      await tx.moderationAction.create({
        data: {
          moderationCaseId: moderationCase.id,
          performedByAdminUserId: actor.userId,
          actionType: data.actionType,
          entityType: data.entityType,
          entityId: data.entityId,
          notes: data.notes ? stripHtml(data.notes) : undefined
        }
      });

      await tx.moderationCase.update({
        where: { id: moderationCase.id },
        data: {
          status: nextStatus,
          assignedAdminUserId: moderationCase.assignedAdminUserId ?? actor.userId
        }
      });
    });

    await this.audit(actor, "MODERATION_CASE_ACTION_ADDED", "moderation_case", caseId, {
      actionType: data.actionType,
      entityType: data.entityType,
      entityId: data.entityId
    });
  }

  async listSupportTickets(
    query: {
      status?: SupportTicketStatus;
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    },
    pagination: PaginationInput
  ) {
    return this.supportService.adminListTickets(query, pagination);
  }

  async assignSupportTicket(actor: ActorContext, ticketId: string, assignedSupportUserId: string) {
    await this.supportService.assignTicket(actor, ticketId, assignedSupportUserId);
    await this.audit(actor, "SUPPORT_TICKET_ASSIGNED", "support_ticket", ticketId, { assignedSupportUserId });
  }

  async updateSupportTicketStatus(actor: ActorContext, ticketId: string, status: SupportTicketStatus) {
    await this.supportService.updateTicketStatus(actor, ticketId, status);
    await this.audit(actor, "SUPPORT_TICKET_STATUS_UPDATED", "support_ticket", ticketId, { status });
  }

  async listAuditLogs(
    query: {
      action?: string;
      entityType?: string;
      entityId?: string;
      adminUserId?: string;
      from?: string;
      to?: string;
    },
    pagination: PaginationInput
  ) {
    const args = getPaginationArgs(pagination);
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.adminUserId ? { adminUserId: query.adminUserId } : {}),
      ...(query.from || query.to ? { createdAt: this.buildDateRangeWhere(query.from, query.to) } : {})
    };

    const [items, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          adminUser: {
            select: publicUserSelect
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: args.skip,
        take: args.take
      }),
      prisma.adminAuditLog.count({ where })
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getAnalyticsOverview(query: { from?: string; to?: string }) {
    const userCreatedAt = this.buildDateRangeWhere(query.from, query.to);
    const requestCreatedAt = this.buildDateRangeWhere(query.from, query.to);
    const bookingCreatedAt = this.buildDateRangeWhere(query.from, query.to);
    const paymentCreatedAt = this.buildDateRangeWhere(query.from, query.to);

    const [users, workersApproved, requestsOpen, bookingsCompleted, revenue] = await Promise.all([
      prisma.user.count({
        where: userCreatedAt ? { createdAt: userCreatedAt } : undefined
      }),
      prisma.workerProfile.count({
        where: {
          verificationStatus: VerificationStatus.APPROVED,
          ...(userCreatedAt ? { createdAt: userCreatedAt } : {})
        }
      }),
      prisma.serviceRequest.count({
        where: {
          status: {
            in: [RequestStatus.OPEN, RequestStatus.MATCHED, RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS]
          },
          ...(requestCreatedAt ? { requestedAt: requestCreatedAt } : {})
        }
      }),
      prisma.booking.count({
        where: {
          status: BookingStatus.COMPLETED,
          ...(bookingCreatedAt ? { createdAt: bookingCreatedAt } : {})
        }
      }),
      prisma.paymentIntent.aggregate({
        where: {
          status: PaymentIntentStatus.SUCCEEDED,
          ...(paymentCreatedAt ? { createdAt: paymentCreatedAt } : {})
        },
        _sum: {
          amountMinor: true
        }
      })
    ]);

    return {
      users,
      workersApproved,
      requestsOpen,
      bookingsCompleted,
      revenueMinor: revenue._sum.amountMinor ?? 0
    };
  }

  async getAnalyticsSearch(query: { from?: string; to?: string }) {
    const createdAt = this.buildDateRangeWhere(query.from, query.to);
    const [impressionCount, topQueries, topCities] = await Promise.all([
      prisma.searchImpression.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.searchImpression.groupBy({
        by: ["queryText"],
        where: {
          ...(createdAt ? { createdAt } : {}),
          queryText: {
            not: null
          }
        },
        _count: {
          _all: true
        },
        orderBy: {
          _count: {
            queryText: "desc"
          }
        },
        take: 10
      }),
      prisma.searchImpression.groupBy({
        by: ["cityId"],
        where: {
          ...(createdAt ? { createdAt } : {}),
          cityId: {
            not: null
          }
        },
        _count: {
          _all: true
        },
        orderBy: {
          _count: {
            cityId: "desc"
          }
        },
        take: 10
      })
    ]);

    return {
      impressionCount,
      topQueries,
      topCities
    };
  }

  async getAnalyticsEngagement(query: { from?: string; to?: string }) {
    const createdAt = this.buildDateRangeWhere(query.from, query.to);

    const [posts, comments, messages, reviews, notifications] = await Promise.all([
      prisma.post.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.comment.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.message.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.review.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.notification.count({
        where: createdAt ? { createdAt } : undefined
      })
    ]);

    return {
      posts,
      comments,
      messages,
      reviews,
      notifications
    };
  }

  async getMarketplaceAnalytics(query: { from?: string; to?: string }) {
    const requestWindow = this.buildDateRangeWhere(query.from, query.to);
    const bookingWindow = this.buildDateRangeWhere(query.from, query.to);
    const paymentWindow = this.buildDateRangeWhere(query.from, query.to);

    const [requestCounts, bookingCounts, featuredWorkers, revenue] = await Promise.all([
      prisma.serviceRequest.groupBy({
        by: ["status"],
        where: requestWindow ? { requestedAt: requestWindow } : undefined,
        _count: {
          _all: true
        }
      }),
      prisma.booking.groupBy({
        by: ["status"],
        where: bookingWindow ? { createdAt: bookingWindow } : undefined,
        _count: {
          _all: true
        }
      }),
      prisma.workerFeaturedSubscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endsAt: {
            gt: new Date()
          }
        }
      }),
      prisma.paymentIntent.aggregate({
        where: {
          status: PaymentIntentStatus.SUCCEEDED,
          ...(paymentWindow ? { createdAt: paymentWindow } : {})
        },
        _sum: {
          amountMinor: true
        }
      })
    ]);

    return {
      serviceRequests: requestCounts,
      bookings: bookingCounts,
      activeFeaturedWorkers: featuredWorkers,
      revenueMinor: revenue._sum.amountMinor ?? 0
    };
  }

  async listConfigs() {
    return prisma.systemConfig.findMany({
      orderBy: {
        configKey: "asc"
      }
    });
  }

  async updateConfig(actor: ActorContext, configKey: string, value: unknown) {
    const config = await prisma.systemConfig.upsert({
      where: { configKey },
      update: {
        valueJson: toJson(value)
      },
      create: {
        configKey,
        valueJson: toJson(value)
      }
    });

    await this.audit(actor, "SYSTEM_CONFIG_UPDATED", "system_config", config.id, { configKey, value });
    return config;
  }

  async listFeatureFlags() {
    return prisma.featureFlag.findMany({
      orderBy: {
        flagKey: "asc"
      }
    });
  }

  async updateFeatureFlag(
    actor: ActorContext,
    flagKey: string,
    data: { defaultEnabled?: boolean; rolloutJson?: Record<string, unknown> | null; description?: string | null }
  ) {
    const featureFlag = await prisma.featureFlag.upsert({
      where: { flagKey },
      update: {
        ...(data.defaultEnabled !== undefined ? { defaultEnabled: data.defaultEnabled } : {}),
        ...(data.rolloutJson !== undefined ? { rolloutJson: data.rolloutJson === null ? Prisma.JsonNull : toJson(data.rolloutJson) } : {}),
        ...(data.description !== undefined ? { description: data.description } : {})
      },
      create: {
        flagKey,
        defaultEnabled: data.defaultEnabled ?? false,
        rolloutJson: data.rolloutJson ? toJson(data.rolloutJson) : undefined,
        description: data.description ?? null
      }
    });

    await this.audit(actor, "FEATURE_FLAG_UPDATED", "feature_flag", featureFlag.id, { flagKey });
    return featureFlag;
  }

  async listCities(query: { isEnabled?: boolean; q?: string }, pagination: PaginationInput) {
    const args = getPaginationArgs(pagination);
    const where: Prisma.CityConfigWhereInput = {
      ...(query.isEnabled !== undefined ? { isEnabled: query.isEnabled } : {}),
      ...(query.q
        ? {
            OR: [{ slug: { contains: query.q } }, { name: { contains: query.q } }]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.cityConfig.findMany({
        where,
        orderBy: {
          name: "asc"
        },
        skip: args.skip,
        take: args.take
      }),
      prisma.cityConfig.count({ where })
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async createCity(
    actor: ActorContext,
    data: {
      slug: string;
      name: string;
      countryCode: string;
      currencyCode: string;
      timezone: string;
      defaultSearchRadiusKm: number;
      isEnabled: boolean;
    }
  ) {
    const city = await prisma.cityConfig.create({
      data
    });

    await this.audit(actor, "CITY_CREATED", "city_config", city.id, { slug: city.slug });
    return city;
  }

  async updateCity(
    actor: ActorContext,
    cityId: string,
    data: Partial<{
      slug: string;
      name: string;
      countryCode: string;
      currencyCode: string;
      timezone: string;
      defaultSearchRadiusKm: number;
      isEnabled: boolean;
    }>
  ) {
    const existing = await prisma.cityConfig.findUnique({
      where: { id: cityId },
      select: { id: true }
    });

    if (!existing) {
      throw Errors.CITY_NOT_FOUND();
    }

    const city = await prisma.cityConfig.update({
      where: { id: cityId },
      data
    });

    await this.audit(actor, "CITY_UPDATED", "city_config", city.id, { updates: data });
    return city;
  }

  async listRoles() {
    const roles = await this.repository.listRoles();

    return roles.map((role) => ({
      id: role.id,
      roleKey: role.roleKey,
      label: role.label,
      description: role.description,
      permissionKeys: role.rolePermissions.map((item) => item.permission.permissionKey).sort()
    }));
  }

  async listPermissions() {
    return this.repository.listPermissions();
  }

  async updateRolePermissions(actor: ActorContext, roleId: string, permissionKeys: AdminPermissionKey[]) {
    const role = await this.repository.getRoleById(roleId);

    if (!role) {
      throw Errors.ADMIN_ROLE_NOT_FOUND();
    }

    await this.repository.updateRolePermissions(roleId, permissionKeys);
    await this.audit(actor, "ROLE_PERMISSIONS_UPDATED", "admin_role", roleId, { permissionKeys });
  }

  async assignAdminRole(actor: ActorContext, userId: string, roleKey: AdminRoleKey) {
    await this.requireUser(userId);
    await this.repository.assignRole(userId, roleKey, actor.userId);
    await this.audit(actor, "ADMIN_ROLE_ASSIGNED", "user", userId, { roleKey });
  }

  async removeAdminRole(actor: ActorContext, userId: string, roleId: string) {
    await this.requireUser(userId);
    await this.repository.removeRole(userId, roleId);
    await this.audit(actor, "ADMIN_ROLE_REMOVED", "user", userId, { roleId });
  }

  async listServiceRequestsAdmin(
    query: {
      status?: RequestStatus;
      tradeCategoryId?: string;
      cityId?: string;
      customerId?: string;
      q?: string;
      from?: string;
      to?: string;
    },
    pagination: PaginationInput
  ) {
    const args = getPaginationArgs(pagination);
    const requestedAt = this.buildDateRangeWhere(query.from, query.to);
    const where: Prisma.ServiceRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.tradeCategoryId ? { tradeCategoryId: query.tradeCategoryId } : {}),
      ...(query.customerId ? { customerUserId: query.customerId } : {}),
      ...(query.cityId
        ? {
            customerUser: {
              profile: {
                is: {
                  cityId: query.cityId
                }
              }
            }
          }
        : {}),
      ...(query.q
        ? {
            OR: [{ title: { contains: query.q } }, { description: { contains: query.q } }]
          }
        : {}),
      ...(requestedAt ? { requestedAt } : {})
    };

    const [items, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        include: {
          customerUser: {
            select: publicUserSelect
          },
          tradeCategory: true,
          preferredWorkerProfile: {
            include: {
              user: {
                select: publicUserSelect
              }
            }
          },
          assignments: {
            include: {
              workerProfile: {
                include: {
                  user: {
                    select: publicUserSelect
                  }
                }
              }
            }
          },
          booking: true,
          items: true
        },
        orderBy: {
          requestedAt: "desc"
        },
        skip: args.skip,
        take: args.take
      }),
      prisma.serviceRequest.count({ where })
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getServiceRequestAdmin(requestId: string) {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        customerUser: {
          select: publicUserSelect
        },
        tradeCategory: true,
        preferredWorkerProfile: {
          include: {
            user: {
              select: publicUserSelect
            }
          }
        },
        assignments: {
          include: {
            workerProfile: {
              include: {
                user: {
                  select: publicUserSelect
                }
              }
            }
          }
        },
        booking: {
          include: {
            workerProfile: {
              include: {
                user: {
                  select: publicUserSelect
                }
              }
            }
          }
        },
        items: true,
        statusHistory: {
          include: {
            changedByUser: {
              select: publicUserSelect
            }
          },
          orderBy: {
            changedAt: "asc"
          }
        }
      }
    });

    if (!request) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    return request;
  }

  async listBookingsAdmin(
    query: {
      status?: BookingStatus;
      workerId?: string;
      customerId?: string;
      cityId?: string;
      from?: string;
      to?: string;
    },
    pagination: PaginationInput
  ) {
    const args = getPaginationArgs(pagination);
    const createdAt = this.buildDateRangeWhere(query.from, query.to);
    const where: Prisma.BookingWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.workerId ? { workerProfileId: query.workerId } : {}),
      ...(query.customerId ? { customerUserId: query.customerId } : {}),
      ...(query.cityId
        ? {
            customerUser: {
              profile: {
                is: {
                  cityId: query.cityId
                }
              }
            }
          }
        : {}),
      ...(createdAt ? { createdAt } : {})
    };

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          customerUser: {
            select: publicUserSelect
          },
          workerProfile: {
            include: {
              user: {
                select: publicUserSelect
              }
            }
          },
          serviceRequest: {
            include: {
              tradeCategory: true
            }
          },
          reschedules: true,
          cancellations: true
        },
        orderBy: {
          scheduledStart: "desc"
        },
        skip: args.skip,
        take: args.take
      }),
      prisma.booking.count({ where })
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getBookingAdmin(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customerUser: {
          select: publicUserSelect
        },
        workerProfile: {
          include: {
            user: {
              select: publicUserSelect
            }
          }
        },
        serviceRequest: {
          include: {
            tradeCategory: true,
            items: true
          }
        },
        reschedules: {
          include: {
            requestedByUser: {
              select: publicUserSelect
            }
          }
        },
        cancellations: {
          include: {
            cancelledByUser: {
              include: {
                profile: true
              }
            }
          }
        },
        review: {
          include: {
            dimensionScores: true
          }
        }
      }
    });

    if (!booking) {
      throw Errors.BOOKING_NOT_FOUND();
    }

    return booking;
  }

  async listFeaturedWorkers(query: { isFeatured?: boolean; q?: string }, pagination: PaginationInput) {
    const args = getPaginationArgs(pagination);
    const where: Prisma.WorkerProfileWhereInput = {
      ...(query.isFeatured !== undefined ? { isFeatured: query.isFeatured } : {}),
      ...(query.q
        ? {
            OR: [
              { headline: { contains: query.q } },
              { user: { profile: { is: { firstName: { contains: query.q } } } } },
              { user: { profile: { is: { lastName: { contains: query.q } } } } },
              { user: { profile: { is: { displayName: { contains: query.q } } } } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.workerProfile.findMany({
        where,
        include: {
          user: {
            select: publicUserSelect
          },
          featuredSubscriptions: {
            orderBy: {
              endsAt: "desc"
            },
            take: 3
          }
        },
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        skip: args.skip,
        take: args.take
      }),
      prisma.workerProfile.count({ where })
    ]);

    return {
      data: items.map((worker) => ({
        id: worker.id,
        userId: worker.userId,
        displayName: getDisplayName(worker.user.profile),
        headline: worker.headline,
        isFeatured: worker.isFeatured,
        verificationStatus: worker.verificationStatus,
        subscriptions: worker.featuredSubscriptions
      })),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getWorkerSubscription(workerId: string) {
    const worker = await this.requireWorker(workerId);

    return {
      workerProfileId: worker.id,
      isFeatured: worker.isFeatured,
      subscriptions: worker.featuredSubscriptions,
      invoices: worker.subscriptionInvoices
    };
  }

  async actionFeaturedWorker(
    actor: ActorContext,
    workerId: string,
    data: { action: "ENABLE" | "DISABLE" | "EXTEND"; endsAt?: string; notes: string }
  ) {
    const worker = await this.requireWorker(workerId);
    const latestSubscription = worker.featuredSubscriptions[0] ?? null;
    let auditAction = "FEATURED_WORKER_ENABLED";

    if (data.action === "ENABLE") {
      await prisma.$transaction(async (tx) => {
        await tx.workerProfile.update({
          where: { id: worker.id },
          data: {
            isFeatured: true
          }
        });

        await tx.workerFeaturedSubscription.create({
          data: {
            workerProfileId: worker.id,
            startsAt: new Date(),
            endsAt: addDays(new Date(), DEFAULT_FEATURED_EXTENSION_DAYS),
            status: SubscriptionStatus.ACTIVE
          }
        });
      });
      auditAction = "FEATURED_WORKER_ENABLED";
    }

    if (data.action === "DISABLE") {
      await prisma.$transaction(async (tx) => {
        await tx.workerProfile.update({
          where: { id: worker.id },
          data: {
            isFeatured: false
          }
        });

        await tx.workerFeaturedSubscription.updateMany({
          where: {
            workerProfileId: worker.id,
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]
            }
          },
          data: {
            status: SubscriptionStatus.CANCELLED
          }
        });
      });
      auditAction = "FEATURED_WORKER_DISABLED";
    }

    if (data.action === "EXTEND") {
      const endsAt = data.endsAt ? new Date(data.endsAt) : null;

      if (!endsAt) {
        throw Errors.VALIDATION_FAILED({ endsAt: ["endsAt is required"] });
      }

      if (latestSubscription) {
        await prisma.workerFeaturedSubscription.update({
          where: { id: latestSubscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            endsAt
          }
        });
      } else {
        await prisma.workerFeaturedSubscription.create({
          data: {
            workerProfileId: worker.id,
            startsAt: new Date(),
            endsAt,
            status: SubscriptionStatus.ACTIVE
          }
        });
      }

      await prisma.workerProfile.update({
        where: { id: worker.id },
        data: {
          isFeatured: true
        }
      });

      auditAction = "FEATURED_WORKER_EXTENDED";
    }

    await this.audit(actor, auditAction, "worker_profile", worker.id, {
      notes: data.notes,
      endsAt: data.endsAt ?? null
    });
  }

  async getWorkerVerificationDocuments(actor: ActorContext, workerId: string) {
    const worker = await this.requireWorker(workerId);
    const documents = worker.certifications.map((certification) => ({
      id: certification.id,
      title: certification.title,
      issuer: certification.issuer,
      documentUrl: certification.certificateUrl,
      verificationStatus: certification.verificationStatus
    }));

    await this.audit(actor, "WORKER_VERIFICATION_DOCUMENTS_VIEWED", "worker_profile", worker.id);

    return {
      workerProfileId: worker.id,
      verificationStatus: worker.verificationStatus,
      latestVerificationRequest: worker.verificationRequests[0] ?? null,
      documents
    };
  }

  async listFraudSignals(
    query: {
      status?: FraudSignalStatus;
      signalKey?: string;
      userId?: string;
      minScore?: number;
      from?: string;
      to?: string;
    },
    pagination: PaginationInput
  ) {
    const args = getPaginationArgs(pagination);
    const createdAt = this.buildDateRangeWhere(query.from, query.to);
    const where: Prisma.FraudSignalWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.signalKey ? { signalKey: query.signalKey } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.minScore !== undefined ? { score: { gte: new Prisma.Decimal(query.minScore) } } : {}),
      ...(createdAt ? { createdAt } : {})
    };

    const [items, total] = await Promise.all([
      prisma.fraudSignal.findMany({
        where,
        include: {
          user: {
            select: publicUserSelect
          }
        },
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        skip: args.skip,
        take: args.take
      }),
      prisma.fraudSignal.count({ where })
    ]);

    return {
      data: items,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async actionFraudSignal(
    actor: ActorContext,
    signalId: string,
    data: { action: "REVIEW" | "DISMISS" | "ACTION"; notes?: string; moderationCaseId?: string }
  ) {
    const signal = await prisma.fraudSignal.findUnique({
      where: { id: signalId }
    });

    if (!signal) {
      throw Errors.FRAUD_SIGNAL_NOT_FOUND();
    }

    const nextStatus =
      data.action === "REVIEW"
        ? FraudSignalStatus.REVIEWED
        : data.action === "DISMISS"
          ? FraudSignalStatus.DISMISSED
          : FraudSignalStatus.ACTIONED;

    await prisma.$transaction(async (tx) => {
      await tx.fraudSignal.update({
        where: { id: signal.id },
        data: {
          status: nextStatus
        }
      });

      if (data.action === "ACTION") {
        const moderationCaseId =
          data.moderationCaseId ??
          (
            await tx.moderationCase.create({
              data: {
                assignedAdminUserId: actor.userId,
                status: ModerationCaseStatus.ACTIONED
              },
              select: {
                id: true
              }
            })
          ).id;

        await tx.moderationAction.create({
          data: {
            moderationCaseId,
            performedByAdminUserId: actor.userId,
            actionType: "FRAUD_SIGNAL_ACTION",
            entityType: signal.entityType ?? "user",
            entityId: signal.entityId ?? signal.userId ?? signal.id,
            notes: data.notes
          }
        });
      }
    });

    const auditAction =
      data.action === "REVIEW"
        ? "FRAUD_SIGNAL_REVIEWED"
        : data.action === "DISMISS"
          ? "FRAUD_SIGNAL_DISMISSED"
          : "FRAUD_SIGNAL_ACTIONED";

    await this.audit(actor, auditAction, "fraud_signal", signal.id, {
      notes: data.notes ?? null,
      moderationCaseId: data.moderationCaseId ?? null
    });
  }

  async getContent(entityType: "post" | "comment" | "review" | "message", entityId: string) {
    let content: unknown;

    switch (entityType) {
      case "post": {
        content = await prisma.post.findUnique({
          where: { id: entityId },
          include: {
            authorUser: {
              select: publicUserSelect
            },
            media: true,
            _count: {
              select: {
                likes: true,
                comments: true
              }
            }
          }
        });
        break;
      }
      case "comment": {
        content = await prisma.comment.findUnique({
          where: { id: entityId },
          include: {
            authorUser: {
              select: publicUserSelect
            },
            post: {
              select: {
                id: true,
                body: true
              }
            },
            review: {
              select: {
                id: true,
                body: true,
                rating: true
              }
            },
            _count: {
              select: {
                likes: true,
                replies: true
              }
            }
          }
        });
        break;
      }
      case "review": {
        content = await prisma.review.findUnique({
          where: { id: entityId },
          include: {
            dimensionScores: true,
            booking: {
              select: {
                id: true,
                workerProfileId: true,
                customerUserId: true,
                scheduledStart: true,
                completedAt: true
              }
            },
            reviewerUser: {
              select: publicUserSelect
            },
            revieweeUser: {
              select: publicUserSelect
            },
            replies: {
              include: {
                authorUser: {
                  select: publicUserSelect
                }
              }
            }
          }
        });
        break;
      }
      case "message": {
        content = await prisma.message.findUnique({
          where: { id: entityId },
          include: {
            attachments: true,
            sender: {
              select: publicUserSelect
            },
            conversation: {
              include: {
                participants: {
                  include: {
                    user: {
                      select: publicUserSelect
                    }
                  }
                }
              }
            }
          }
        });
        break;
      }
    }

    if (!content) {
      throw Errors.CONTENT_NOT_FOUND();
    }

    const moderationHistory = await prisma.report.findMany({
      where: {
        entityType,
        entityId
      },
      include: {
        moderationCases: {
          include: {
            actions: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return {
      entityType,
      entityId,
      content,
      moderationHistory
    };
  }

  async getSystemHealthAdmin() {
    const health = {
      database: { ok: false, latencyMs: 0 },
      redis: { ok: false, latencyMs: 0, memoryUsedMb: null as number | null },
      typesense: { enabled: isTypesenseConfigured, docCount: null as number | null },
      queues: {} as Record<string, unknown>,
      websocketConnections: 0,
      recentJobRuns: [] as unknown[]
    };

    try {
      const startedAt = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      health.database = { ok: true, latencyMs: Date.now() - startedAt };
    } catch {
      health.database = { ok: false, latencyMs: 0 };
    }

    try {
      const startedAt = Date.now();
      await redis.ping();
      const info = await redis.info("memory");
      const usedMemoryLine = info
        .split("\n")
        .find((line) => line.startsWith("used_memory:"));
      const usedMemoryBytes = usedMemoryLine ? Number.parseInt(usedMemoryLine.split(":")[1] ?? "0", 10) : 0;

      health.redis = {
        ok: true,
        latencyMs: Date.now() - startedAt,
        memoryUsedMb: Number.isFinite(usedMemoryBytes) ? Math.round((usedMemoryBytes / (1024 * 1024)) * 100) / 100 : null
      };
    } catch {
      health.redis = { ok: false, latencyMs: 0, memoryUsedMb: null };
    }

    if (isTypesenseConfigured && typesenseClient) {
      try {
        const collection = await typesenseClient.collections(typesenseWorkersCollection).retrieve();
        health.typesense.docCount = typeof collection.num_documents === "number" ? collection.num_documents : null;
      } catch {
        health.typesense.docCount = null;
      }
    }

    const [recentJobRuns, websocketConnections] = await Promise.all([
      prisma.jobRun.findMany({
        take: 20,
        orderBy: {
          startedAt: "desc"
        }
      }),
      redis.get("ws:connections:count")
    ]);

    health.recentJobRuns = recentJobRuns;
    health.websocketConnections = Number.parseInt(websocketConnections ?? "0", 10) || 0;

    return health;
  }

  async getSystemMetrics() {
    const [health, users, workers, requests, bookings] = await Promise.all([
      this.getSystemHealthAdmin(),
      prisma.user.count(),
      prisma.workerProfile.count(),
      prisma.serviceRequest.count(),
      prisma.booking.count()
    ]);

    return {
      totals: {
        users,
        workers,
        requests,
        bookings
      },
      health
    };
  }

  private async resolveBroadcastRecipients(targetAudience: "ALL_USERS" | "ALL_WORKERS" | "CITY" | "TRADE", targetId?: string) {
    if (targetAudience === "ALL_USERS") {
      const users = await prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE
        },
        select: {
          id: true
        }
      });

      return users.map((user) => user.id);
    }

    if (targetAudience === "ALL_WORKERS") {
      const workers = await prisma.workerProfile.findMany({
        where: {
          verificationStatus: VerificationStatus.APPROVED,
          user: {
            status: UserStatus.ACTIVE
          }
        },
        select: {
          userId: true
        }
      });

      return workers.map((worker) => worker.userId);
    }

    if (targetAudience === "CITY" && targetId) {
      const profiles = await prisma.userProfile.findMany({
        where: {
          cityId: targetId,
          user: {
            status: UserStatus.ACTIVE
          }
        },
        select: {
          userId: true
        }
      });

      return profiles.map((profile) => profile.userId);
    }

    if (targetAudience === "TRADE" && targetId) {
      const workers = await prisma.workerTradeCategory.findMany({
        where: {
          tradeCategoryId: targetId,
          workerProfile: {
            verificationStatus: VerificationStatus.APPROVED,
            user: {
              status: UserStatus.ACTIVE
            }
          }
        },
        select: {
          workerProfile: {
            select: {
              userId: true
            }
          }
        }
      });

      return workers.map((worker) => worker.workerProfile.userId);
    }

    return [];
  }

  async broadcastNotification(
    actor: ActorContext,
    data: {
      targetAudience: "ALL_USERS" | "ALL_WORKERS" | "CITY" | "TRADE";
      targetId?: string;
      title: string;
      body: string;
      channel: "IN_APP" | "PUSH" | "EMAIL";
      scheduledAt?: string;
    }
  ) {
    const uniqueRecipients = Array.from(
      new Set(await this.resolveBroadcastRecipients(data.targetAudience, data.targetId))
    );

    const broadcast = await prisma.notificationBroadcast.create({
      data: {
        createdByAdminId: actor.userId,
        targetAudience: data.targetAudience,
        targetId: data.targetId,
        title: stripHtml(data.title),
        body: stripHtml(data.body),
        channel: data.channel,
        estimatedRecipients: uniqueRecipients.length,
        status: data.scheduledAt ? "QUEUED" : "PROCESSING",
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null
      }
    });

    if (!data.scheduledAt) {
      for (const userId of uniqueRecipients) {
        await this.notificationsService.createInAppNotification(userId, "ADMIN_BROADCAST", {
          broadcastId: broadcast.id,
          title: broadcast.title,
          body: broadcast.body,
          channel: broadcast.channel
        });
      }

      await prisma.notificationBroadcast.update({
        where: { id: broadcast.id },
        data: {
          actualRecipients: uniqueRecipients.length,
          status: "COMPLETED",
          completedAt: new Date()
        }
      });
    }

    await this.audit(actor, "NOTIFICATION_BROADCAST_CREATED", "notification_broadcast", broadcast.id, {
      targetAudience: data.targetAudience,
      targetId: data.targetId ?? null,
      estimatedRecipients: uniqueRecipients.length,
      channel: data.channel
    });

    return {
      broadcastId: broadcast.id,
      estimatedRecipients: uniqueRecipients.length
    };
  }
}

export { AdminService };
