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

import { buildCsv } from "../../lib/csv";
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

const clipText = (value: string | null | undefined, max = 160): string => {
  const normalized = stripHtml(value ?? "");

  if (!normalized) {
    return "";
  }

  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
};

const resolveFollowLink = (targetType: "USER" | "WORKER", targetId: string): string => (targetType === "USER" ? `/users/${targetId}` : `/workers/${targetId}`);

const resolveNotificationLink = (payload: Record<string, unknown>): string | null => {
  const readString = (...keys: string[]) => {
    for (const key of keys) {
      const value = payload[key];

      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }

    return null;
  };

  const bookingId = readString("bookingId");
  const requestId = readString("requestId", "serviceRequestId");
  const workerId = readString("workerProfileId", "workerId");
  const userId = readString("userId");
  const postId = readString("postId");
  const commentId = readString("commentId");
  const reviewId = readString("reviewId");
  const reportId = readString("reportId");

  if (bookingId) {
    return `/bookings/${bookingId}`;
  }

  if (requestId) {
    return `/service-requests/${requestId}`;
  }

  if (workerId) {
    return `/workers/${workerId}`;
  }

  if (userId) {
    return `/users/${userId}`;
  }

  if (postId) {
    return `/content/post/${postId}`;
  }

  if (commentId) {
    return `/content/comment/${commentId}`;
  }

  if (reviewId) {
    return `/content/review/${reviewId}`;
  }

  if (reportId) {
    return `/reports/${reportId}`;
  }

  return null;
};

interface AdminActivityCollectionItem {
  id: string;
  kind: string;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  createdAt: Date;
  linkPath?: string | null;
  meta?: Array<{
    label: string;
    value: string;
  }>;
}

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

  private buildReportsWhere(query: {
    status?: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
    entityType?: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }): Prisma.ReportWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.severity ? { severity: query.severity } : {})
    };
  }

  private buildModerationCasesWhere(query: { status?: ModerationCaseStatus }): Prisma.ModerationCaseWhereInput {
    return {
      ...(query.status ? { status: query.status } : {})
    };
  }

  private buildFraudSignalsWhere(query: {
    status?: FraudSignalStatus;
    signalKey?: string;
    userId?: string;
    minScore?: number;
    from?: string;
    to?: string;
  }): Prisma.FraudSignalWhereInput {
    const createdAt = this.buildDateRangeWhere(query.from, query.to);

    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.signalKey ? { signalKey: query.signalKey } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.minScore !== undefined ? { score: { gte: new Prisma.Decimal(query.minScore) } } : {}),
      ...(createdAt ? { createdAt } : {})
    };
  }

  private buildAuditLogsWhere(query: {
    action?: string;
    entityType?: string;
    entityId?: string;
    adminUserId?: string;
    from?: string;
    to?: string;
  }): Prisma.AdminAuditLogWhereInput {
    return {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.adminUserId ? { adminUserId: query.adminUserId } : {}),
      ...(query.from || query.to ? { createdAt: this.buildDateRangeWhere(query.from, query.to) } : {})
    };
  }

  private resolveAdminEntityLinkPath(entityType?: string | null, entityId?: string | null): string | null {
    if (!entityType || !entityId) {
      return null;
    }

    switch (entityType) {
      case "post":
      case "comment":
      case "review":
      case "message":
        return `/content/${entityType}/${entityId}`;
      case "service_request":
        return `/service-requests/${entityId}`;
      case "booking":
        return `/bookings/${entityId}`;
      case "user":
        return `/users/${entityId}`;
      case "worker":
      case "worker_profile":
        return `/workers/${entityId}`;
      case "report":
        return `/reports/${entityId}`;
      case "moderation_case":
        return `/moderation-cases/${entityId}`;
      case "support_ticket":
        return `/support-tickets/${entityId}`;
      case "fraud_signal":
        return `/fraud-signals/${entityId}`;
      default:
        return null;
    }
  }

  private stringifyAuditValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "—";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.stringifyAuditValue(entry)).join(", ");
    }

    return JSON.stringify(value);
  }

  private extractMetadataHighlights(metadata: unknown, prefix = ""): Array<{ label: string; value: string }> {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return [];
    }

    const entries = Object.entries(metadata as Record<string, unknown>);
    const highlights: Array<{ label: string; value: string }> = [];

    for (const [key, rawValue] of entries) {
      if (highlights.length >= 8) {
        break;
      }

      const label = prefix ? `${prefix}.${key}` : key;

      if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
        highlights.push(...this.extractMetadataHighlights(rawValue, label));
        continue;
      }

      highlights.push({
        label,
        value: this.stringifyAuditValue(rawValue)
      });
    }

    return highlights.slice(0, 8);
  }

  private mapAdminAuditLog(entry: {
    id: string;
    adminUserId?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    metadataJson?: Prisma.JsonValue | null;
    createdAt: Date;
    adminUser?: {
      email?: string | null;
      profile?: {
        firstName?: string | null;
        lastName?: string | null;
        displayName?: string | null;
      } | null;
    } | null;
  }) {
    return {
      ...entry,
      entityLinkPath: this.resolveAdminEntityLinkPath(entry.entityType, entry.entityId),
      metadataHighlights: this.extractMetadataHighlights(entry.metadataJson)
    };
  }

  private buildExportFilename(prefix: string): string {
    return `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
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
        profile: {
          include: {
            city: true
          }
        },
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
        availabilityRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }]
        },
        availabilityExceptions: {
          orderBy: {
            startsAt: "desc"
          }
        },
        portfolioItems: {
          include: {
            mediaAsset: {
              select: {
                id: true,
                category: true,
                visibility: true,
                mimeType: true,
                status: true,
                originalFilename: true,
                finalCdnUrl: true,
                storageKey: true,
                createdAt: true,
                confirmedAt: true
              }
            }
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
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
      bio: string | null;
      cityId: string | null;
      city: {
        id: string;
        slug: string;
        name: string;
        countryCode: string;
        timezone: string;
      } | null;
      lat: Prisma.Decimal | null;
      lng: Prisma.Decimal | null;
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
            bio: user.profile.bio,
            cityId: user.profile.cityId,
            city: user.profile.city
              ? {
                  id: user.profile.city.id,
                  slug: user.profile.city.slug,
                  name: user.profile.city.name,
                  countryCode: user.profile.city.countryCode,
                  timezone: user.profile.city.timezone
                }
              : null,
            lat: user.profile.lat?.toString() ?? null,
            lng: user.profile.lng?.toString() ?? null
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

  private mapMediaAssetSummary(asset: {
    id: string;
    category: string;
    visibility: string;
    mimeType: string;
    status: string;
    originalFilename: string | null;
    finalCdnUrl: string | null;
    storageKey: string;
    createdAt: Date;
    confirmedAt: Date | null;
  }) {
    return {
      id: asset.id,
      category: asset.category,
      visibility: asset.visibility,
      mimeType: asset.mimeType,
      status: asset.status,
      originalFilename: asset.originalFilename,
      finalCdnUrl: asset.finalCdnUrl,
      storageKey: asset.storageKey,
      createdAt: asset.createdAt,
      confirmedAt: asset.confirmedAt
    };
  }

  private mapSupportTicketSummary(ticket: {
    id: string;
    openedByUserId: string;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    status: SupportTicketStatus;
    priority: string;
    subject: string;
    body: string;
    assignedSupportUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    openedByUser?: typeof publicUserSelect extends Prisma.UserSelect ? Prisma.UserGetPayload<{ select: typeof publicUserSelect }> | null : never;
    assignedSupportUser?: typeof publicUserSelect extends Prisma.UserSelect ? Prisma.UserGetPayload<{ select: typeof publicUserSelect }> | null : never;
  }) {
    return {
      id: ticket.id,
      openedByUserId: ticket.openedByUserId,
      relatedEntityType: ticket.relatedEntityType,
      relatedEntityId: ticket.relatedEntityId,
      status: ticket.status,
      priority: ticket.priority,
      subject: ticket.subject,
      body: ticket.body,
      assignedSupportUserId: ticket.assignedSupportUserId,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      openedByUser: ticket.openedByUser ?? null,
      assignedSupportUser: ticket.assignedSupportUser ?? null
    };
  }

  private buildSupportTicketEntityLinkPath(entityType: string, entityId: string): string | null {
    switch (entityType) {
      case "booking":
        return `/bookings/${entityId}`;
      case "service_request":
        return `/service-requests/${entityId}`;
      case "user":
        return `/users/${entityId}`;
      case "worker":
        return `/workers/${entityId}`;
      case "payment":
        return null;
      default:
        return null;
    }
  }

  private async getSupportTicketRelatedEntitySummary(relatedEntityType?: string | null, relatedEntityId?: string | null) {
    if (!relatedEntityType || !relatedEntityId) {
      return null;
    }

    switch (relatedEntityType) {
      case "booking": {
        const booking = await prisma.booking.findUnique({
          where: { id: relatedEntityId },
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
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          }
        });

        if (!booking) {
          return {
            entityType: relatedEntityType,
            entityId: relatedEntityId,
            title: `Missing booking ${relatedEntityId}`,
            subtitle: "The linked booking no longer exists.",
            status: "MISSING",
            linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
            meta: []
          };
        }

        return {
          entityType: relatedEntityType,
          entityId: relatedEntityId,
          title: booking.serviceRequest.title,
          subtitle: `${getDisplayName(booking.customerUser.profile) ?? booking.customerUser.email ?? booking.customerUser.id} -> ${
            getDisplayName(booking.workerProfile.user.profile) ?? booking.workerProfile.user.email ?? booking.workerProfile.id
          }`,
          status: booking.status,
          linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
          meta: [
            {
              label: "Request",
              value: booking.serviceRequest.id
            },
            {
              label: "Scheduled",
              value: booking.scheduledStart.toISOString()
            }
          ]
        };
      }
      case "service_request": {
        const serviceRequest = await prisma.serviceRequest.findUnique({
          where: { id: relatedEntityId },
          include: {
            customerUser: {
              select: publicUserSelect
            },
            tradeCategory: {
              select: {
                id: true,
                name: true
              }
            },
            preferredWorkerProfile: {
              include: {
                user: {
                  select: publicUserSelect
                }
              }
            }
          }
        });

        if (!serviceRequest) {
          return {
            entityType: relatedEntityType,
            entityId: relatedEntityId,
            title: `Missing request ${relatedEntityId}`,
            subtitle: "The linked service request no longer exists.",
            status: "MISSING",
            linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
            meta: []
          };
        }

        return {
          entityType: relatedEntityType,
          entityId: relatedEntityId,
          title: serviceRequest.title,
          subtitle:
            serviceRequest.tradeCategory?.name ??
            getDisplayName(serviceRequest.customerUser.profile) ??
            serviceRequest.customerUser.email ??
            serviceRequest.customerUser.id,
          status: serviceRequest.status,
          linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
          meta: [
            {
              label: "Customer",
              value: getDisplayName(serviceRequest.customerUser.profile) ?? serviceRequest.customerUser.email ?? serviceRequest.customerUser.id
            },
            {
              label: "Preferred worker",
              value:
                serviceRequest.preferredWorkerProfile
                  ? getDisplayName(serviceRequest.preferredWorkerProfile.user.profile) ??
                    serviceRequest.preferredWorkerProfile.user.email ??
                    serviceRequest.preferredWorkerProfile.id
                  : "None"
            }
          ]
        };
      }
      case "user": {
        const user = await prisma.user.findUnique({
          where: { id: relatedEntityId },
          select: publicUserSelect
        });

        if (!user) {
          return {
            entityType: relatedEntityType,
            entityId: relatedEntityId,
            title: `Missing user ${relatedEntityId}`,
            subtitle: "The linked user no longer exists.",
            status: "MISSING",
            linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
            meta: []
          };
        }

        return {
          entityType: relatedEntityType,
          entityId: relatedEntityId,
          title: getDisplayName(user.profile) ?? user.email ?? user.id,
          subtitle: user.email ?? user.phone ?? "Linked user account",
          status: user.status,
          linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
          meta: [
            {
              label: "Email verified",
              value: user.isEmailVerified ? "Yes" : "No"
            },
            {
              label: "Phone verified",
              value: user.isPhoneVerified ? "Yes" : "No"
            }
          ]
        };
      }
      case "worker": {
        const worker = await prisma.workerProfile.findUnique({
          where: { id: relatedEntityId },
          include: {
            user: {
              select: publicUserSelect
            },
            tradeCategories: {
              include: {
                tradeCategory: true
              }
            }
          }
        });

        if (!worker) {
          return {
            entityType: relatedEntityType,
            entityId: relatedEntityId,
            title: `Missing worker ${relatedEntityId}`,
            subtitle: "The linked worker profile no longer exists.",
            status: "MISSING",
            linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
            meta: []
          };
        }

        return {
          entityType: relatedEntityType,
          entityId: relatedEntityId,
          title: getDisplayName(worker.user.profile) ?? worker.user.email ?? worker.id,
          subtitle: worker.headline ?? (worker.tradeCategories.map((entry) => entry.tradeCategory.name).join(", ") || "Linked worker profile"),
          status: worker.verificationStatus,
          linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
          meta: [
            {
              label: "Featured",
              value: worker.isFeatured ? "Yes" : "No"
            },
            {
              label: "Reviews",
              value: String(worker.totalReviews)
            }
          ]
        };
      }
      case "payment": {
        const paymentIntent = await prisma.paymentIntent.findUnique({
          where: { id: relatedEntityId },
          include: {
            user: {
              select: publicUserSelect
            },
            booking: {
              include: {
                serviceRequest: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        });

        if (!paymentIntent) {
          return {
            entityType: relatedEntityType,
            entityId: relatedEntityId,
            title: `Missing payment ${relatedEntityId}`,
            subtitle: "The linked payment intent no longer exists.",
            status: "MISSING",
            linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
            meta: []
          };
        }

        return {
          entityType: relatedEntityType,
          entityId: relatedEntityId,
          title: paymentIntent.booking?.serviceRequest?.title ?? `Payment ${paymentIntent.id}`,
          subtitle: getDisplayName(paymentIntent.user.profile) ?? paymentIntent.user.email ?? paymentIntent.user.id,
          status: paymentIntent.status,
          linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
          meta: [
            {
              label: "Amount",
              value: `${paymentIntent.amountMinor} ${paymentIntent.currencyCode} minor`
            },
            {
              label: "Booking",
              value: paymentIntent.bookingId ?? "None"
            }
          ]
        };
      }
      default:
        return {
          entityType: relatedEntityType,
          entityId: relatedEntityId,
          title: `${relatedEntityType} ${relatedEntityId}`,
          subtitle: "Linked entity type is not yet expanded in the admin casefile.",
          status: null,
          linkPath: this.buildSupportTicketEntityLinkPath(relatedEntityType, relatedEntityId),
          meta: []
        };
    }
  }

  private sortActivityTimeline(items: AdminActivityCollectionItem[]) {
    return items
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 28);
  }

  private async getUserActivitySnapshot(userId: string) {
    const [
      postsCount,
      commentsCount,
      postLikesCount,
      commentLikesCount,
      postSavesCount,
      followsCount,
      followersCount,
      savedWorkersCount,
      reportsCount,
      messagesCount,
      conversationsCount,
      notificationsCount,
      serviceRequestsCount,
      bookingsCount,
      reviewsWrittenCount,
      reviewsReceivedCount,
      supportTicketsCount,
      fraudSignalsCount,
      mediaAssetsCount,
      recentPosts,
      recentComments,
      recentPostLikes,
      recentCommentLikes,
      recentPostSaves,
      recentFollows,
      recentFollowers,
      recentSavedWorkers,
      recentReports,
      recentMessages,
      recentConversations,
      recentNotifications,
      recentServiceRequests,
      recentBookings,
      recentReviewsWritten,
      recentReviewsReceived,
      recentSupportTickets,
      recentFraudSignals,
      recentMediaAssets
    ] = await Promise.all([
      prisma.post.count({ where: { authorUserId: userId } }),
      prisma.comment.count({ where: { authorUserId: userId } }),
      prisma.postLike.count({ where: { userId } }),
      prisma.commentLike.count({ where: { userId } }),
      prisma.postSave.count({ where: { userId } }),
      prisma.userFollow.count({ where: { followerUserId: userId } }),
      prisma.userFollow.count({
        where: {
          targetType: "USER",
          targetId: userId
        }
      }),
      prisma.customerSavedWorker.count({ where: { userId } }),
      prisma.report.count({ where: { reporterUserId: userId } }),
      prisma.message.count({ where: { senderId: userId } }),
      prisma.conversationParticipant.count({ where: { userId } }),
      prisma.notification.count({ where: { userId } }),
      prisma.serviceRequest.count({ where: { customerUserId: userId } }),
      prisma.booking.count({ where: { customerUserId: userId } }),
      prisma.review.count({ where: { reviewerUserId: userId } }),
      prisma.review.count({ where: { revieweeUserId: userId } }),
      prisma.supportTicket.count({ where: { openedByUserId: userId } }),
      prisma.fraudSignal.count({ where: { userId } }),
      prisma.mediaAsset.count({ where: { ownerUserId: userId } }),
      prisma.post.findMany({
        where: { authorUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.comment.findMany({
        where: { authorUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.postLike.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          post: {
            select: {
              id: true,
              body: true
            }
          }
        }
      }),
      prisma.commentLike.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          comment: {
            select: {
              id: true,
              body: true
            }
          }
        }
      }),
      prisma.postSave.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          post: {
            select: {
              id: true,
              body: true,
              visibility: true,
              isDeleted: true
            }
          }
        }
      }),
      prisma.userFollow.findMany({
        where: { followerUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.userFollow.findMany({
        where: {
          targetType: "USER",
          targetId: userId
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          followerUser: {
            select: publicUserSelect
          }
        }
      }),
      prisma.customerSavedWorker.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          workerProfile: {
            include: {
              user: {
                select: publicUserSelect
              },
              tradeCategories: {
                include: {
                  tradeCategory: true
                }
              }
            }
          }
        }
      }),
      prisma.report.findMany({
        where: { reporterUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.message.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          attachments: {
            select: {
              id: true
            }
          },
          conversation: {
            select: {
              id: true,
              conversationType: true,
              serviceRequestId: true
            }
          }
        }
      }),
      prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          serviceRequest: {
            select: {
              id: true,
              title: true,
              status: true
            }
          },
          participants: {
            take: 3,
            include: {
              user: {
                select: publicUserSelect
              }
            }
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              body: true,
              messageType: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              participants: true,
              messages: true
            }
          }
        }
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.serviceRequest.findMany({
        where: { customerUserId: userId },
        orderBy: { requestedAt: "desc" },
        take: 5,
        include: {
          tradeCategory: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.booking.findMany({
        where: { customerUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          serviceRequest: {
            select: {
              id: true,
              title: true
            }
          }
        }
      }),
      prisma.review.findMany({
        where: { reviewerUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.review.findMany({
        where: { revieweeUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.supportTicket.findMany({
        where: { openedByUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.fraudSignal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.mediaAsset.findMany({
        where: { ownerUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);

    const activityCollections = {
      posts: recentPosts.map<AdminActivityCollectionItem>((post) => ({
        id: `post:${post.id}`,
        kind: "POST",
        title: "Created post",
        subtitle: clipText(post.body),
        status: post.isDeleted ? "DELETED" : post.visibility,
        createdAt: post.createdAt,
        linkPath: `/content/post/${post.id}`
      })),
      comments: recentComments.map<AdminActivityCollectionItem>((comment) => ({
        id: `comment:${comment.id}`,
        kind: "COMMENT",
        title: "Added comment",
        subtitle: clipText(comment.body),
        status: comment.isDeleted ? "DELETED" : comment.reviewId ? "REVIEW" : "POST",
        createdAt: comment.createdAt,
        linkPath: `/content/comment/${comment.id}`
      })),
      postLikes: recentPostLikes.map<AdminActivityCollectionItem>((item) => ({
        id: `post-like:${item.id}`,
        kind: "POST_LIKE",
        title: "Liked post",
        subtitle: clipText(item.post.body),
        createdAt: item.createdAt,
        linkPath: `/content/post/${item.post.id}`
      })),
      commentLikes: recentCommentLikes.map<AdminActivityCollectionItem>((item) => ({
        id: `comment-like:${item.id}`,
        kind: "COMMENT_LIKE",
        title: "Liked comment",
        subtitle: clipText(item.comment.body),
        createdAt: item.createdAt,
        linkPath: `/content/comment/${item.comment.id}`
      })),
      postSaves: recentPostSaves.map<AdminActivityCollectionItem>((item) => ({
        id: `post-save:${item.id}`,
        kind: "POST_SAVE",
        title: "Saved post",
        subtitle: clipText(item.post.body),
        status: item.post.isDeleted ? "DELETED" : item.post.visibility,
        createdAt: item.createdAt,
        linkPath: `/content/post/${item.post.id}`
      })),
      follows: recentFollows.map<AdminActivityCollectionItem>((follow) => ({
        id: `follow:${follow.id}`,
        kind: "FOLLOW",
        title: `Followed ${follow.targetType.toLowerCase()}`,
        subtitle: follow.targetId,
        createdAt: follow.createdAt,
        linkPath: resolveFollowLink(follow.targetType, follow.targetId)
      })),
      followers: recentFollowers.map<AdminActivityCollectionItem>((follow) => ({
        id: `follower:${follow.id}`,
        kind: "FOLLOWER",
        title: "Gained follower",
        subtitle: getDisplayName(follow.followerUser.profile) ?? follow.followerUser.email ?? follow.followerUser.id,
        createdAt: follow.createdAt,
        linkPath: `/users/${follow.followerUser.id}`,
        meta: [
          {
            label: "Target type",
            value: follow.targetType
          }
        ]
      })),
      savedWorkers: recentSavedWorkers.map<AdminActivityCollectionItem>((item) => ({
        id: `saved-worker:${item.id}`,
        kind: "SAVED_WORKER",
        title: getDisplayName(item.workerProfile.user.profile) ?? item.workerProfile.user.email ?? item.workerProfile.id,
        subtitle: item.workerProfile.headline ?? (item.workerProfile.tradeCategories.map((entry) => entry.tradeCategory.name).join(", ") || "Saved worker profile"),
        status: item.workerProfile.verificationStatus,
        createdAt: item.createdAt,
        linkPath: `/workers/${item.workerProfile.id}`
      })),
      reports: recentReports.map<AdminActivityCollectionItem>((report) => ({
        id: `report:${report.id}`,
        kind: "REPORT",
        title: `Filed ${report.severity.toLowerCase()} report`,
        subtitle: `${report.entityType} · ${report.reason}`,
        status: report.status,
        createdAt: report.createdAt,
        linkPath: `/reports/${report.id}`
      })),
      messages: recentMessages.map<AdminActivityCollectionItem>((message) => ({
        id: `message:${message.id}`,
        kind: "MESSAGE",
        title: `Sent ${message.messageType.toLowerCase()} message`,
        subtitle: clipText(message.body) || `Conversation ${message.conversation.conversationType.toLowerCase()}`,
        createdAt: message.createdAt,
        linkPath: message.conversation.serviceRequestId ? `/service-requests/${message.conversation.serviceRequestId}` : null,
        meta: [
          {
            label: "Conversation",
            value: message.conversation.conversationType
          },
          {
            label: "Attachments",
            value: String(message.attachments.length)
          }
        ]
      })),
      conversations: recentConversations.map<AdminActivityCollectionItem>((conversation) => ({
        id: `conversation:${conversation.id}`,
        kind: "CONVERSATION",
        title:
          conversation.serviceRequest?.title ??
          `${conversation.conversationType.replaceAll("_", " ")} conversation`,
        subtitle:
          clipText(conversation.messages[0]?.body) ||
          conversation.participants
            .map((entry) => getDisplayName(entry.user.profile) ?? entry.user.email ?? entry.user.id)
            .join(" · "),
        status: conversation.serviceRequest?.status ?? conversation.conversationType,
        createdAt: conversation.updatedAt,
        linkPath: conversation.serviceRequestId ? `/service-requests/${conversation.serviceRequestId}` : null,
        meta: [
          {
            label: "Participants",
            value: String(conversation._count.participants)
          },
          {
            label: "Messages",
            value: String(conversation._count.messages)
          }
        ]
      })),
      notifications: recentNotifications.map<AdminActivityCollectionItem>((notification) => ({
        id: `notification:${notification.id}`,
        kind: "NOTIFICATION",
        title: notification.notificationType.replaceAll("_", " "),
        subtitle: clipText(
          Object.entries(notification.payloadJson as Record<string, unknown>)
            .slice(0, 2)
            .map(([key, value]) => `${key}: ${String(value)}`)
            .join(" · ")
        ),
        status: notification.isRead ? "READ" : "UNREAD",
        createdAt: notification.createdAt,
        linkPath: resolveNotificationLink(notification.payloadJson as Record<string, unknown>)
      })),
      serviceRequests: recentServiceRequests.map<AdminActivityCollectionItem>((request) => ({
        id: `request:${request.id}`,
        kind: "SERVICE_REQUEST",
        title: request.title,
        subtitle: request.tradeCategory?.name ?? clipText(request.description),
        status: request.status,
        createdAt: request.requestedAt,
        linkPath: `/service-requests/${request.id}`
      })),
      bookings: recentBookings.map<AdminActivityCollectionItem>((booking) => ({
        id: `booking:${booking.id}`,
        kind: "BOOKING",
        title: booking.serviceRequest?.title ?? "Booking",
        subtitle: `Customer booking · ${booking.status.toLowerCase()}`,
        status: booking.status,
        createdAt: booking.createdAt,
        linkPath: `/bookings/${booking.id}`
      })),
      reviewsWritten: recentReviewsWritten.map<AdminActivityCollectionItem>((review) => ({
        id: `review-written:${review.id}`,
        kind: "REVIEW_WRITTEN",
        title: `Wrote ${review.rating}/5 review`,
        subtitle: clipText(review.body),
        createdAt: review.createdAt,
        linkPath: `/content/review/${review.id}`
      })),
      reviewsReceived: recentReviewsReceived.map<AdminActivityCollectionItem>((review) => ({
        id: `review-received:${review.id}`,
        kind: "REVIEW_RECEIVED",
        title: `Received ${review.rating}/5 review`,
        subtitle: clipText(review.body),
        createdAt: review.createdAt,
        linkPath: `/content/review/${review.id}`
      })),
      supportTickets: recentSupportTickets.map<AdminActivityCollectionItem>((ticket) => ({
        id: `support:${ticket.id}`,
        kind: "SUPPORT_TICKET",
        title: ticket.subject,
        subtitle: clipText(ticket.body),
        status: ticket.status,
        createdAt: ticket.createdAt,
        linkPath: `/support-tickets/${ticket.id}`
      })),
      fraudSignals: recentFraudSignals.map<AdminActivityCollectionItem>((signal) => ({
        id: `fraud:${signal.id}`,
        kind: "FRAUD_SIGNAL",
        title: signal.signalKey.replaceAll("_", " "),
        subtitle: `${signal.entityType ?? "account"} · score ${signal.score.toString()}`,
        status: signal.status,
        createdAt: signal.createdAt,
        linkPath: `/fraud-signals/${signal.id}`
      })),
      mediaAssets: recentMediaAssets.map<AdminActivityCollectionItem>((asset) => ({
        id: `media:${asset.id}`,
        kind: "MEDIA",
        title: asset.originalFilename ?? asset.category,
        subtitle: `${asset.category} · ${asset.status.toLowerCase()}`,
        status: asset.status,
        createdAt: asset.createdAt,
        meta: [
          {
            label: "Visibility",
            value: asset.visibility
          },
          {
            label: "Mime",
            value: asset.mimeType
          }
        ]
      }))
    };

    const activityTimeline = this.sortActivityTimeline(Object.values(activityCollections).flat());

    return {
      activitySummary: {
        posts: postsCount,
        comments: commentsCount,
        postLikes: postLikesCount,
        commentLikes: commentLikesCount,
        postSaves: postSavesCount,
        follows: followsCount,
        followers: followersCount,
        savedWorkers: savedWorkersCount,
        reports: reportsCount,
        messages: messagesCount,
        conversations: conversationsCount,
        notifications: notificationsCount,
        serviceRequests: serviceRequestsCount,
        bookings: bookingsCount,
        reviewsWritten: reviewsWrittenCount,
        reviewsReceived: reviewsReceivedCount,
        supportTickets: supportTicketsCount,
        fraudSignals: fraudSignalsCount,
        mediaAssets: mediaAssetsCount
      },
      activityCollections,
      recentMediaAssets: recentMediaAssets.map((asset) => this.mapMediaAssetSummary(asset)),
      activityTimeline
    };
  }

  private async getWorkerActivitySnapshot(workerId: string, userId: string) {
    const userActivity = await this.getUserActivitySnapshot(userId);
    const [assignmentCount, bookingCount, savedByCount, searchImpressionsCount, recentAssignments, recentBookings, recentSavedByUsers, recentImpressions] = await Promise.all([
      prisma.serviceRequestAssignment.count({ where: { workerProfileId: workerId } }),
      prisma.booking.count({ where: { workerProfileId: workerId } }),
      prisma.customerSavedWorker.count({ where: { workerProfileId: workerId } }),
      prisma.searchImpression.count({ where: { workerProfileId: workerId } }),
      prisma.serviceRequestAssignment.findMany({
        where: { workerProfileId: workerId },
        orderBy: { assignedAt: "desc" },
        take: 5,
        include: {
          serviceRequest: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      }),
      prisma.booking.findMany({
        where: { workerProfileId: workerId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          serviceRequest: {
            select: {
              id: true,
              title: true
            }
          }
        }
      }),
      prisma.customerSavedWorker.findMany({
        where: { workerProfileId: workerId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: {
            select: publicUserSelect
          }
        }
      }),
      prisma.searchImpression.findMany({
        where: { workerProfileId: workerId },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    const workerCollections = {
      ...userActivity.activityCollections,
      assignments: recentAssignments.map<AdminActivityCollectionItem>((assignment) => ({
        id: `assignment:${assignment.id}`,
        kind: "ASSIGNMENT",
        title: assignment.serviceRequest.title,
        subtitle: `Assignment ${assignment.assignmentStatus.toLowerCase()}`,
        status: assignment.assignmentStatus,
        createdAt: assignment.assignedAt,
        linkPath: `/service-requests/${assignment.serviceRequest.id}`
      })),
      bookingsAsWorker: recentBookings.map<AdminActivityCollectionItem>((booking) => ({
        id: `worker-booking:${booking.id}`,
        kind: "WORKER_BOOKING",
        title: booking.serviceRequest.title,
        subtitle: `Worker booking · ${booking.status.toLowerCase()}`,
        status: booking.status,
        createdAt: booking.createdAt,
        linkPath: `/bookings/${booking.id}`
      })),
      savedByUsers: recentSavedByUsers.map<AdminActivityCollectionItem>((entry) => ({
        id: `saved-by:${entry.id}`,
        kind: "SAVED_BY_USER",
        title: getDisplayName(entry.user.profile) ?? entry.user.email ?? entry.user.id,
        subtitle: "Saved this worker profile",
        status: entry.user.status,
        createdAt: entry.createdAt,
        linkPath: `/users/${entry.user.id}`
      })),
      searchImpressions: recentImpressions.map<AdminActivityCollectionItem>((impression) => ({
        id: `impression:${impression.id}`,
        kind: "SEARCH_IMPRESSION",
        title: "Appeared in search",
        subtitle: impression.queryText ? `Query: ${impression.queryText}` : "Marketplace search impression",
        createdAt: impression.createdAt,
        meta: [
          {
            label: "Rank",
            value: String(impression.rankPosition)
          },
          {
            label: "City",
            value: impression.cityId ?? "Unknown"
          }
        ]
      }))
    };

    const workerTimeline = this.sortActivityTimeline(Object.values(workerCollections).flat());

    return {
      activitySummary: {
        ...userActivity.activitySummary,
        assignments: assignmentCount,
        bookingsAsWorker: bookingCount,
        savedByUsers: savedByCount,
        searchImpressions: searchImpressionsCount
      },
      activityCollections: workerCollections,
      recentMediaAssets: userActivity.recentMediaAssets,
      activityTimeline: workerTimeline
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
          profile: {
            include: {
              city: true
            }
          },
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
    const [activeSessions, openTicketCount, activitySnapshot] = await Promise.all([
      prisma.userSession.findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 8
      }),
      prisma.supportTicket.count({
        where: {
          openedByUserId: userId,
          status: {
            in: [SupportTicketStatus.OPEN, SupportTicketStatus.ASSIGNED, SupportTicketStatus.WAITING_INTERNAL, SupportTicketStatus.WAITING_USER]
          }
        }
      }),
      this.getUserActivitySnapshot(userId)
    ]);

    return {
      ...this.mapUserSummary(user),
      updatedAt: user.updatedAt,
      sessionCount: activeSessions.length,
      openTicketCount,
      activeSessions: activeSessions.map((session) => ({
        id: session.id,
        deviceType: session.deviceType,
        ipAddress: session.ipAddress,
        mfaVerified: session.mfaVerified,
        mfaVerifiedAt: session.mfaVerifiedAt,
        mfaMethod: session.mfaMethod,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      })),
      activitySummary: activitySnapshot.activitySummary,
      activityCollections: activitySnapshot.activityCollections,
      recentMediaAssets: activitySnapshot.recentMediaAssets,
      activityTimeline: activitySnapshot.activityTimeline
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

  async revokeUserSession(actor: ActorContext, userId: string, sessionId: string) {
    await this.requireUser(userId);

    const result = await prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    if (result.count === 0) {
      throw Errors.USER_SESSION_NOT_FOUND();
    }

    await this.audit(actor, "USER_SESSION_REVOKED", "user", userId, { sessionId });
  }

  async revokeAllUserSessions(actor: ActorContext, userId: string) {
    await this.requireUser(userId);

    const result = await prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    await this.audit(actor, "USER_ALL_SESSIONS_REVOKED", "user", userId, { revokedCount: result.count });

    return {
      revokedCount: result.count
    };
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
    const worker = await this.requireWorker(workerId);
    const activitySnapshot = await this.getWorkerActivitySnapshot(worker.id, worker.userId);

    return {
      ...worker,
      activitySummary: {
        ...activitySnapshot.activitySummary,
        services: worker.services.length,
        serviceAreas: worker.serviceAreas.length,
        certifications: worker.certifications.length,
        verificationRequests: worker.verificationRequests.length,
        portfolioItems: worker.portfolioItems.length,
        availabilityRules: worker.availabilityRules.length,
        availabilityExceptions: worker.availabilityExceptions.length,
        featuredSubscriptions: worker.featuredSubscriptions.length,
        subscriptionInvoices: worker.subscriptionInvoices.length
      },
      activityCollections: activitySnapshot.activityCollections,
      recentMediaAssets: activitySnapshot.recentMediaAssets,
      activityTimeline: activitySnapshot.activityTimeline
    };
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
    const where = this.buildReportsWhere(query);

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

  async bulkUpdateReports(
    actor: ActorContext,
    data: {
      reportIds: string[];
      status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
      notes?: string;
    }
  ) {
    const reportIds = Array.from(new Set(data.reportIds));
    const result = await prisma.report.updateMany({
      where: {
        id: {
          in: reportIds
        }
      },
      data: {
        status: data.status
      }
    });

    await this.audit(actor, "REPORT_BULK_UPDATED", "report", undefined, {
      reportIds,
      status: data.status,
      notes: data.notes ? stripHtml(data.notes) : null,
      updatedCount: result.count
    });

    return {
      updatedCount: result.count
    };
  }

  async exportReports(query: {
    status?: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
    entityType?: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }) {
    const items = await prisma.report.findMany({
      where: this.buildReportsWhere(query),
      include: {
        reporterUser: {
          select: publicUserSelect
        },
        moderationCases: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const columns = [
      "id",
      "status",
      "severity",
      "reason",
      "entityType",
      "entityId",
      "reporterUserId",
      "reporterEmail",
      "reporterName",
      "moderationCaseCount",
      "moderationCaseIds",
      "createdAt"
    ];
    const rows = items.map((item) => ({
      id: item.id,
      status: item.status,
      severity: item.severity,
      reason: item.reason,
      entityType: item.entityType,
      entityId: item.entityId,
      reporterUserId: item.reporterUserId,
      reporterEmail: item.reporterUser?.email ?? "",
      reporterName: getDisplayName(item.reporterUser?.profile) ?? "",
      moderationCaseCount: item.moderationCases.length,
      moderationCaseIds: item.moderationCases.map((moderationCase) => moderationCase.id).join(";"),
      createdAt: item.createdAt
    }));

    return {
      filename: this.buildExportFilename("admin-reports"),
      csv: buildCsv(columns, rows)
    };
  }

  async listModerationCases(query: { status?: ModerationCaseStatus }, pagination: PaginationInput) {
    const args = getPaginationArgs(pagination);
    const where = this.buildModerationCasesWhere(query);

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

  async exportModerationCases(query: { status?: ModerationCaseStatus }) {
    const items = await prisma.moderationCase.findMany({
      where: this.buildModerationCasesWhere(query),
      include: {
        report: true,
        assignedAdminUser: {
          select: publicUserSelect
        },
        actions: {
          select: {
            id: true,
            actionType: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const columns = [
      "id",
      "status",
      "reportId",
      "reportReason",
      "reportEntityType",
      "reportEntityId",
      "assignedAdminUserId",
      "assignedAdminEmail",
      "assignedAdminName",
      "actionCount",
      "actionTypes",
      "createdAt",
      "updatedAt"
    ];
    const rows = items.map((item) => ({
      id: item.id,
      status: item.status,
      reportId: item.reportId ?? "",
      reportReason: item.report?.reason ?? "",
      reportEntityType: item.report?.entityType ?? "",
      reportEntityId: item.report?.entityId ?? "",
      assignedAdminUserId: item.assignedAdminUserId ?? "",
      assignedAdminEmail: item.assignedAdminUser?.email ?? "",
      assignedAdminName: getDisplayName(item.assignedAdminUser?.profile) ?? "",
      actionCount: item.actions.length,
      actionTypes: item.actions.map((action) => action.actionType).join(";"),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return {
      filename: this.buildExportFilename("admin-moderation-cases"),
      csv: buildCsv(columns, rows)
    };
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

  async bulkAddModerationActions(
    actor: ActorContext,
    data: {
      caseIds: string[];
      actionType: string;
      notes?: string;
    }
  ) {
    const caseIds = Array.from(new Set(data.caseIds));
    const moderationCases = await prisma.moderationCase.findMany({
      where: {
        id: {
          in: caseIds
        }
      },
      include: {
        report: true
      }
    });

    for (const moderationCase of moderationCases) {
      await this.addModerationAction(actor, moderationCase.id, {
        actionType: data.actionType,
        entityType: moderationCase.report?.entityType ?? "moderation_case",
        entityId: moderationCase.report?.entityId ?? moderationCase.id,
        notes: data.notes
      });
    }

    await this.audit(actor, "MODERATION_CASE_BULK_ACTION_ADDED", "moderation_case", undefined, {
      caseIds: moderationCases.map((moderationCase) => moderationCase.id),
      actionType: data.actionType,
      notes: data.notes ? stripHtml(data.notes) : null,
      updatedCount: moderationCases.length
    });

    return {
      updatedCount: moderationCases.length
    };
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

  async getSupportTicketDetail(ticketId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        openedByUser: {
          select: publicUserSelect
        },
        assignedSupportUser: {
          select: publicUserSelect
        },
        messages: {
          include: {
            authorUser: {
              select: publicUserSelect
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!ticket) {
      throw Errors.SUPPORT_TICKET_NOT_FOUND();
    }

    const [openedByUserInvestigation, relatedSupportTickets, relatedEntitySummary, auditTrail] = await Promise.all([
      this.getUserDetail(ticket.openedByUserId),
      prisma.supportTicket.findMany({
        where: {
          openedByUserId: ticket.openedByUserId,
          id: {
            not: ticket.id
          }
        },
        include: {
          openedByUser: {
            select: publicUserSelect
          },
          assignedSupportUser: {
            select: publicUserSelect
          }
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 6
      }),
      this.getSupportTicketRelatedEntitySummary(ticket.relatedEntityType, ticket.relatedEntityId),
      prisma.adminAuditLog.findMany({
        where: {
          OR: [
            {
              entityType: "support_ticket",
              entityId: ticket.id
            },
            {
              entityType: "user",
              entityId: ticket.openedByUserId
            }
          ]
        },
        include: {
          adminUser: {
            select: publicUserSelect
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 16
      })
    ]);

    return {
      ...this.mapSupportTicketSummary(ticket),
      messages: ticket.messages.map((message) => ({
        id: message.id,
        authorUserId: message.authorUserId,
        body: message.body,
        isInternalNote: message.isInternalNote,
        createdAt: message.createdAt,
        authorUser: {
          id: message.authorUser.id,
          displayName: getDisplayName(message.authorUser.profile) ?? message.authorUser.email ?? message.authorUser.id
        }
      })),
      openedByUserInvestigation,
      relatedSupportTickets: relatedSupportTickets.map((relatedTicket) => this.mapSupportTicketSummary(relatedTicket)),
      relatedEntitySummary,
      auditTrail: auditTrail.map((entry) => this.mapAdminAuditLog(entry))
    };
  }

  async exportSupportTickets(query: {
    status?: SupportTicketStatus;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }) {
    const items = await prisma.supportTicket.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.priority ? { priority: query.priority } : {})
      },
      include: {
        openedByUser: {
          select: publicUserSelect
        },
        assignedSupportUser: {
          select: publicUserSelect
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const columns = [
      "id",
      "status",
      "priority",
      "subject",
      "openedByUserId",
      "openedByEmail",
      "openedByName",
      "assignedSupportUserId",
      "assignedSupportEmail",
      "assignedSupportName",
      "relatedEntityType",
      "relatedEntityId",
      "createdAt",
      "updatedAt"
    ];
    const rows = items.map((item) => ({
      id: item.id,
      status: item.status,
      priority: item.priority,
      subject: item.subject,
      openedByUserId: item.openedByUserId,
      openedByEmail: item.openedByUser?.email ?? "",
      openedByName: getDisplayName(item.openedByUser?.profile) ?? "",
      assignedSupportUserId: item.assignedSupportUserId ?? "",
      assignedSupportEmail: item.assignedSupportUser?.email ?? "",
      assignedSupportName: getDisplayName(item.assignedSupportUser?.profile) ?? "",
      relatedEntityType: item.relatedEntityType ?? "",
      relatedEntityId: item.relatedEntityId ?? "",
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return {
      filename: this.buildExportFilename("admin-support-tickets"),
      csv: buildCsv(columns, rows)
    };
  }

  async assignSupportTicket(actor: ActorContext, ticketId: string, assignedSupportUserId: string) {
    await this.supportService.assignTicket(actor, ticketId, assignedSupportUserId);
    await this.audit(actor, "SUPPORT_TICKET_ASSIGNED", "support_ticket", ticketId, { assignedSupportUserId });
  }

  async addSupportTicketMessage(actor: ActorContext, ticketId: string, data: { body: string; isInternalNote?: boolean }) {
    await this.supportService.addMessage(actor, ticketId, data);
    await this.audit(actor, data.isInternalNote ? "SUPPORT_TICKET_INTERNAL_NOTE_ADDED" : "SUPPORT_TICKET_REPLY_SENT", "support_ticket", ticketId, {
      isInternalNote: Boolean(data.isInternalNote),
      bodyPreview: clipText(data.body, 120)
    });
  }

  async updateSupportTicketStatus(actor: ActorContext, ticketId: string, status: SupportTicketStatus) {
    await this.supportService.updateTicketStatus(actor, ticketId, status);
    await this.audit(actor, "SUPPORT_TICKET_STATUS_UPDATED", "support_ticket", ticketId, { status });
  }

  async bulkUpdateSupportTickets(
    actor: ActorContext,
    data: {
      ticketIds: string[];
      assignedSupportUserId?: string;
      status?: SupportTicketStatus;
    }
  ) {
    const ticketIds = Array.from(new Set(data.ticketIds));

    for (const ticketId of ticketIds) {
      if (data.assignedSupportUserId) {
        await this.assignSupportTicket(actor, ticketId, data.assignedSupportUserId);
      }

      if (data.status) {
        await this.updateSupportTicketStatus(actor, ticketId, data.status);
      }
    }

    await this.audit(actor, "SUPPORT_TICKETS_BULK_UPDATED", "support_ticket", undefined, {
      ticketIds,
      assignedSupportUserId: data.assignedSupportUserId ?? null,
      status: data.status ?? null,
      updatedCount: ticketIds.length
    });

    return {
      updatedCount: ticketIds.length
    };
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
    const where = this.buildAuditLogsWhere(query);

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
      data: items.map((item) => this.mapAdminAuditLog(item)),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async exportAuditLogs(query: {
    action?: string;
    entityType?: string;
    entityId?: string;
    adminUserId?: string;
    from?: string;
    to?: string;
  }) {
    const items = await prisma.adminAuditLog.findMany({
      where: this.buildAuditLogsWhere(query),
      include: {
        adminUser: {
          select: publicUserSelect
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const columns = [
      "id",
      "action",
      "entityType",
      "entityId",
      "adminUserId",
      "adminEmail",
      "adminName",
      "metadataJson",
      "createdAt"
    ];
    const rows = items.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType ?? "",
      entityId: item.entityId ?? "",
      adminUserId: item.adminUserId ?? "",
      adminEmail: item.adminUser?.email ?? "",
      adminName: getDisplayName(item.adminUser?.profile) ?? "",
      metadataJson: item.metadataJson ?? {},
      createdAt: item.createdAt
    }));

    return {
      filename: this.buildExportFilename("admin-audit-logs"),
      csv: buildCsv(columns, rows)
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
    const [impressionCount, distinctQueryRows, distinctUserRows, distinctWorkerRows, avgRankPosition, topQueries, topCities, topWorkersRaw] = await Promise.all([
      prisma.searchImpression.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.searchImpression.findMany({
        where: {
          ...(createdAt ? { createdAt } : {}),
          queryText: {
            not: null
          }
        },
        distinct: ["queryText"],
        select: {
          queryText: true
        }
      }),
      prisma.searchImpression.findMany({
        where: {
          ...(createdAt ? { createdAt } : {}),
          userId: {
            not: null
          }
        },
        distinct: ["userId"],
        select: {
          userId: true
        }
      }),
      prisma.searchImpression.findMany({
        where: {
          ...(createdAt ? { createdAt } : {}),
          workerProfileId: {
            not: null
          }
        },
        distinct: ["workerProfileId"],
        select: {
          workerProfileId: true
        }
      }),
      prisma.searchImpression.aggregate({
        where: createdAt ? { createdAt } : undefined,
        _avg: {
          rankPosition: true
        }
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
      }),
      prisma.searchImpression.groupBy({
        by: ["workerProfileId"],
        where: {
          ...(createdAt ? { createdAt } : {}),
          workerProfileId: {
            not: null
          }
        },
        _count: {
          _all: true
        },
        orderBy: {
          _count: {
            workerProfileId: "desc"
          }
        },
        take: 8
      })
    ]);

    const topWorkerIds = topWorkersRaw.map((entry) => entry.workerProfileId).filter((value): value is string => Boolean(value));
    const topWorkers = topWorkerIds.length
      ? await prisma.workerProfile.findMany({
          where: {
            id: {
              in: topWorkerIds
            }
          },
          include: {
            user: {
              select: publicUserSelect
            }
          }
        })
      : [];
    const workerById = new Map(topWorkers.map((worker) => [worker.id, worker]));

    return {
      impressionCount,
      uniqueQueries: distinctQueryRows.length,
      uniqueUsers: distinctUserRows.length,
      uniqueWorkers: distinctWorkerRows.length,
      averageRankPosition: Number(avgRankPosition._avg.rankPosition ?? 0),
      topQueries,
      topCities,
      topWorkers: topWorkersRaw.map((entry) => {
        const worker = entry.workerProfileId ? workerById.get(entry.workerProfileId) : null;
        return {
          workerProfileId: entry.workerProfileId ?? "",
          displayName: worker ? getDisplayName(worker.user.profile) ?? worker.user.email ?? worker.id : entry.workerProfileId ?? "Unknown worker",
          headline: worker?.headline ?? null,
          _count: entry._count
        };
      })
    };
  }

  async getAnalyticsEngagement(query: { from?: string; to?: string }) {
    const createdAt = this.buildDateRangeWhere(query.from, query.to);

    const [posts, comments, messages, reviews, notifications, conversations, postLikes, commentLikes, postSaves, follows, savedWorkers, supportTickets, unreadNotifications] = await Promise.all([
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
      }),
      prisma.conversation.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.postLike.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.commentLike.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.postSave.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.userFollow.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.customerSavedWorker.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.supportTicket.count({
        where: createdAt ? { createdAt } : undefined
      }),
      prisma.notification.count({
        where: {
          ...(createdAt ? { createdAt } : {}),
          isRead: false
        }
      })
    ]);

    return {
      posts,
      comments,
      messages,
      reviews,
      notifications,
      conversations,
      postLikes,
      commentLikes,
      postSaves,
      follows,
      savedWorkers,
      supportTickets,
      unreadNotifications,
      readNotifications: Math.max(notifications - unreadNotifications, 0),
      avgMessagesPerConversation: conversations > 0 ? Number((messages / conversations).toFixed(2)) : 0
    };
  }

  async getMarketplaceAnalytics(query: { from?: string; to?: string }) {
    const requestWindow = this.buildDateRangeWhere(query.from, query.to);
    const bookingWindow = this.buildDateRangeWhere(query.from, query.to);
    const paymentWindow = this.buildDateRangeWhere(query.from, query.to);

    const [requestCounts, bookingCounts, featuredWorkers, revenue, paymentCounts, featuredSubscriptionCounts, paymentSupportEscalations, workerSupportEscalations, requestSupportEscalations, bookingSupportEscalations] = await Promise.all([
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
      }),
      prisma.paymentIntent.groupBy({
        by: ["status"],
        where: paymentWindow ? { createdAt: paymentWindow } : undefined,
        _count: {
          _all: true
        }
      }),
      prisma.workerFeaturedSubscription.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      }),
      prisma.supportTicket.count({
        where: {
          relatedEntityType: "payment"
        }
      }),
      prisma.supportTicket.count({
        where: {
          relatedEntityType: "worker"
        }
      }),
      prisma.supportTicket.count({
        where: {
          relatedEntityType: "service_request"
        }
      }),
      prisma.supportTicket.count({
        where: {
          relatedEntityType: "booking"
        }
      })
    ]);

    const totalRequests = requestCounts.reduce((sum, item) => sum + item._count._all, 0);
    const totalBookings = bookingCounts.reduce((sum, item) => sum + item._count._all, 0);
    const completedBookings = bookingCounts
      .filter((item) => item.status === BookingStatus.COMPLETED)
      .reduce((sum, item) => sum + item._count._all, 0);

    return {
      serviceRequests: requestCounts,
      bookings: bookingCounts,
      paymentIntents: paymentCounts,
      featuredSubscriptions: featuredSubscriptionCounts,
      activeFeaturedWorkers: featuredWorkers,
      revenueMinor: revenue._sum.amountMinor ?? 0,
      totalRequests,
      totalBookings,
      completedBookings,
      requestToBookingRate: totalRequests > 0 ? Number(((totalBookings / totalRequests) * 100).toFixed(2)) : 0,
      requestToCompletionRate: totalRequests > 0 ? Number(((completedBookings / totalRequests) * 100).toFixed(2)) : 0,
      supportEscalations: {
        payment: paymentSupportEscalations,
        worker: workerSupportEscalations,
        serviceRequest: requestSupportEscalations,
        booking: bookingSupportEscalations
      }
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
    const where = this.buildFraudSignalsWhere(query);

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

    const enrichedItems = await this.enrichFraudSignalsWithInvestigationContext(items);

    return {
      data: enrichedItems,
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async exportFraudSignals(query: {
    status?: FraudSignalStatus;
    signalKey?: string;
    userId?: string;
    minScore?: number;
    from?: string;
    to?: string;
  }) {
    const items = await prisma.fraudSignal.findMany({
      where: this.buildFraudSignalsWhere(query),
      include: {
        user: {
          select: publicUserSelect
        }
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }]
    });

    const columns = [
      "id",
      "status",
      "signalKey",
      "score",
      "userId",
      "userEmail",
      "userName",
      "entityType",
      "entityId",
      "createdAt"
    ];
    const rows = items.map((item) => ({
      id: item.id,
      status: item.status,
      signalKey: item.signalKey,
      score: item.score,
      userId: item.userId ?? "",
      userEmail: item.user?.email ?? "",
      userName: getDisplayName(item.user?.profile) ?? "",
      entityType: item.entityType ?? "",
      entityId: item.entityId ?? "",
      createdAt: item.createdAt
    }));

    return {
      filename: this.buildExportFilename("admin-fraud-signals"),
      csv: buildCsv(columns, rows)
    };
  }

  private async enrichFraudSignalsWithInvestigationContext<
    T extends {
      id: string;
      userId?: string | null;
      user?: {
        id: string;
        email?: string | null;
        profile?: {
          firstName?: string | null;
          lastName?: string | null;
          displayName?: string | null;
        } | null;
      } | null;
    }
  >(items: T[]) {
    const userIds = Array.from(new Set(items.map((item) => item.userId).filter((value): value is string => Boolean(value))));

    if (userIds.length === 0) {
      return items;
    }

    const now = new Date();
    const activeSessions = await prisma.userSession.findMany({
      where: {
        userId: { in: userIds },
        revokedAt: null,
        expiresAt: { gt: now }
      },
      orderBy: [{ createdAt: "desc" }]
    });

    const activeSessionCountByUser = new Map<string, number>();
    const latestSessionByUser = new Map<string, (typeof activeSessions)[number]>();

    for (const session of activeSessions) {
      activeSessionCountByUser.set(session.userId, (activeSessionCountByUser.get(session.userId) ?? 0) + 1);

      if (!latestSessionByUser.has(session.userId)) {
        latestSessionByUser.set(session.userId, session);
      }
    }

    const latestSessionFingerprints = Array.from(latestSessionByUser.values());
    const ipAddresses = Array.from(new Set(latestSessionFingerprints.map((session) => session.ipAddress).filter((value): value is string => Boolean(value))));
    const deviceTypes = Array.from(new Set(latestSessionFingerprints.map((session) => session.deviceType).filter((value): value is string => Boolean(value))));

    const relatedSessions =
      ipAddresses.length > 0 || deviceTypes.length > 0
        ? await prisma.userSession.findMany({
            where: {
              revokedAt: null,
              expiresAt: { gt: now },
              OR: [
                ...(ipAddresses.length > 0 ? [{ ipAddress: { in: ipAddresses } }] : []),
                ...(deviceTypes.length > 0 ? [{ deviceType: { in: deviceTypes } }] : [])
              ]
            },
            include: {
              user: {
                select: publicUserSelect
              }
            },
            orderBy: [{ createdAt: "desc" }]
          })
        : [];

    const sameFingerprintAccountsByUser = new Map<
      string,
      Array<{
        userId: string;
        email?: string | null;
        displayName?: string | null;
        deviceType?: string | null;
        ipAddress?: string | null;
        lastSeenAt?: Date | null;
      }>
    >();
    const sameIpAccountsByUser = new Map<
      string,
      Array<{
        userId: string;
        email?: string | null;
        displayName?: string | null;
        deviceType?: string | null;
        ipAddress?: string | null;
        lastSeenAt?: Date | null;
      }>
    >();

    for (const [userId, latestSession] of latestSessionByUser.entries()) {
      const sameFingerprintAccounts: Array<{
        userId: string;
        email?: string | null;
        displayName?: string | null;
        deviceType?: string | null;
        ipAddress?: string | null;
        lastSeenAt?: Date | null;
      }> = [];
      const sameIpAccounts: Array<{
        userId: string;
        email?: string | null;
        displayName?: string | null;
        deviceType?: string | null;
        ipAddress?: string | null;
        lastSeenAt?: Date | null;
      }> = [];
      const seenFingerprintUsers = new Set<string>();
      const seenIpUsers = new Set<string>();

      for (const session of relatedSessions) {
        if (session.userId === userId) {
          continue;
        }

        const sharesFingerprint =
          Boolean(latestSession.ipAddress) &&
          Boolean(latestSession.deviceType) &&
          latestSession.ipAddress === session.ipAddress &&
          latestSession.deviceType === session.deviceType;
        const sharesIp = Boolean(latestSession.ipAddress) && latestSession.ipAddress === session.ipAddress;

        if (sharesFingerprint && !seenFingerprintUsers.has(session.userId)) {
          seenFingerprintUsers.add(session.userId);
          sameFingerprintAccounts.push({
            userId: session.userId,
            email: session.user.email,
            displayName: getDisplayName(session.user.profile) ?? session.user.email ?? session.userId,
            deviceType: session.deviceType,
            ipAddress: session.ipAddress,
            lastSeenAt: session.createdAt
          });
        }

        if (sharesIp && !seenIpUsers.has(session.userId)) {
          seenIpUsers.add(session.userId);
          sameIpAccounts.push({
            userId: session.userId,
            email: session.user.email,
            displayName: getDisplayName(session.user.profile) ?? session.user.email ?? session.userId,
            deviceType: session.deviceType,
            ipAddress: session.ipAddress,
            lastSeenAt: session.createdAt
          });
        }
      }

      sameFingerprintAccountsByUser.set(userId, sameFingerprintAccounts);
      sameIpAccountsByUser.set(userId, sameIpAccounts);
    }

    const [reportCounts, openSupportTicketCounts] = await Promise.all([
      prisma.report.groupBy({
        by: ["reporterUserId"],
        where: {
          reporterUserId: {
            in: userIds
          }
        },
        _count: {
          _all: true
        }
      }),
      prisma.supportTicket.groupBy({
        by: ["openedByUserId"],
        where: {
          openedByUserId: {
            in: userIds
          },
          status: {
            in: [SupportTicketStatus.OPEN, SupportTicketStatus.ASSIGNED, SupportTicketStatus.WAITING_USER, SupportTicketStatus.WAITING_INTERNAL]
          }
        },
        _count: {
          _all: true
        }
      })
    ]);

    const reportCountByUser = new Map(reportCounts.map((entry) => [entry.reporterUserId, entry._count._all]));
    const openSupportTicketCountByUser = new Map(openSupportTicketCounts.map((entry) => [entry.openedByUserId, entry._count._all]));

    return items.map((item) => {
      if (!item.userId) {
        return item;
      }

      const latestSession = latestSessionByUser.get(item.userId);

      return {
        ...item,
        investigationContext: {
          activeSessionCount: activeSessionCountByUser.get(item.userId) ?? 0,
          reportCount: reportCountByUser.get(item.userId) ?? 0,
          openSupportTicketCount: openSupportTicketCountByUser.get(item.userId) ?? 0,
          latestSession: latestSession
            ? {
                id: latestSession.id,
                deviceType: latestSession.deviceType,
                ipAddress: latestSession.ipAddress,
                mfaVerified: latestSession.mfaVerified,
                mfaVerifiedAt: latestSession.mfaVerifiedAt,
                mfaMethod: latestSession.mfaMethod,
                createdAt: latestSession.createdAt,
                expiresAt: latestSession.expiresAt
              }
            : null,
          sameFingerprintAccounts: sameFingerprintAccountsByUser.get(item.userId) ?? [],
          sameIpAccounts: sameIpAccountsByUser.get(item.userId) ?? []
        }
      };
    });
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

  async bulkActionFraudSignals(
    actor: ActorContext,
    data: {
      signalIds: string[];
      action: "REVIEW" | "DISMISS" | "ACTION";
      notes?: string;
      moderationCaseId?: string;
    }
  ) {
    const signalIds = Array.from(new Set(data.signalIds));

    for (const signalId of signalIds) {
      await this.actionFraudSignal(actor, signalId, data);
    }

    await this.audit(actor, "FRAUD_SIGNALS_BULK_UPDATED", "fraud_signal", undefined, {
      signalIds,
      action: data.action,
      notes: data.notes ?? null,
      moderationCaseId: data.moderationCaseId ?? null,
      updatedCount: signalIds.length
    });

    return {
      updatedCount: signalIds.length
    };
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
