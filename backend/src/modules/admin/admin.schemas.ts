import { z } from "zod";

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const DateRangeQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const AdminListUsersQuery = PaginationQuery.extend({
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]).optional(),
  q: z.string().max(200).optional(),
  cityId: z.string().uuid().optional()
});

const AdminUserIdParams = z.object({
  userId: z.string().uuid()
});

const SuspendUserBody = z
  .object({
    reason: z.string().min(5).max(500)
  })
  .strict();

const ReactivateUserBody = z
  .object({
    notes: z.string().max(500).optional()
  })
  .strict();

const AdminListWorkersQuery = PaginationQuery.extend({
  verificationStatus: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"]).optional(),
  q: z.string().max(200).optional()
});

const AdminWorkerIdParams = z.object({
  workerId: z.string().uuid()
});

const VerifyWorkerBody = z
  .object({
    notes: z.string().max(1000).optional()
  })
  .strict();

const RejectVerificationBody = z
  .object({
    reviewNotes: z.string().min(10).max(1000)
  })
  .strict();

const AdminPostsQuery = PaginationQuery.extend({
  q: z.string().max(200).optional(),
  isDeleted: z.coerce.boolean().optional()
});

const PostIdParams = z.object({
  postId: z.string().uuid()
});

const CommentIdParams = z.object({
  commentId: z.string().uuid()
});

const ReviewIdParams = z.object({
  reviewId: z.string().uuid()
});

const AdminListReportsQuery = PaginationQuery.extend({
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
  entityType: z.string().max(50).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional()
});

const ReportIdParams = z.object({
  reportId: z.string().uuid()
});

const AdminListModerationCasesQuery = PaginationQuery.extend({
  status: z.enum(["OPEN", "IN_REVIEW", "ACTIONED", "DISMISSED", "CLOSED"]).optional()
});

const ModerationCaseIdParams = z.object({
  caseId: z.string().uuid()
});

const AddModerationActionBody = z
  .object({
    actionType: z.string().min(1).max(100),
    entityType: z.string().min(1).max(50),
    entityId: z.string().uuid(),
    notes: z.string().max(2000).optional()
  })
  .strict();

const AdminListSupportTicketsQuery = PaginationQuery.extend({
  status: z.enum(["OPEN", "ASSIGNED", "WAITING_USER", "WAITING_INTERNAL", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional()
});

const TicketIdParams = z.object({
  ticketId: z.string().uuid()
});

const AssignTicketBody = z
  .object({
    assignedSupportUserId: z.string().uuid()
  })
  .strict();

const UpdateTicketStatusBody = z
  .object({
    status: z.enum(["OPEN", "ASSIGNED", "WAITING_USER", "WAITING_INTERNAL", "RESOLVED", "CLOSED"])
  })
  .strict();

const AdminAuditLogQuery = PaginationQuery.extend({
  action: z.string().max(100).optional(),
  entityType: z.string().max(50).optional(),
  entityId: z.string().uuid().optional(),
  adminUserId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const AdminAnalyticsQuery = DateRangeQuery;

const ConfigKeyParams = z.object({
  configKey: z.string().min(1).max(120)
});

const UpdateConfigBody = z
  .object({
    value: z.unknown()
  })
  .strict();

const FlagKeyParams = z.object({
  flagKey: z.string().min(1).max(120)
});

const UpdateFeatureFlagBody = z
  .object({
    defaultEnabled: z.boolean().optional(),
    rolloutJson: z.record(z.unknown()).optional().nullable(),
    description: z.string().max(500).optional().nullable()
  })
  .strict();

const AdminCitiesQuery = PaginationQuery.extend({
  isEnabled: z.coerce.boolean().optional(),
  q: z.string().max(120).optional()
});

const CreateCityBody = z
  .object({
    slug: z.string().min(1).max(120).regex(/^[a-z0-9_]+$/),
    name: z.string().min(1).max(120),
    countryCode: z.string().length(2).toUpperCase(),
    currencyCode: z.string().length(3).toUpperCase(),
    timezone: z.string().min(1).max(64),
    defaultSearchRadiusKm: z.number().int().min(1).max(100).default(10),
    isEnabled: z.boolean().default(false)
  })
  .strict();

const UpdateCityBody = CreateCityBody.partial();

const CityIdParams = z.object({
  cityId: z.string().uuid()
});

const RoleIdParams = z.object({
  roleId: z.string().uuid()
});

const UpdateRolePermissionsBody = z
  .object({
    permissionKeys: z.array(z.enum([
      "USER_VIEW",
      "USER_SUSPEND",
      "USER_REACTIVATE",
      "WORKER_VIEW",
      "WORKER_VERIFY",
      "WORKER_REJECT_VERIFICATION",
      "POST_DELETE",
      "COMMENT_DELETE",
      "REVIEW_DELETE",
      "REPORT_VIEW",
      "MODERATION_CASE_ASSIGN",
      "MODERATION_CASE_ACTION",
      "SUPPORT_TICKET_VIEW",
      "SUPPORT_TICKET_ASSIGN",
      "SUPPORT_TICKET_RESPOND",
      "AUDIT_LOG_VIEW",
      "ANALYTICS_VIEW_OVERVIEW",
      "ANALYTICS_VIEW_SEARCH",
      "ANALYTICS_VIEW_ENGAGEMENT",
      "CONFIG_VIEW",
      "CONFIG_UPDATE",
      "FEATURE_FLAG_VIEW",
      "FEATURE_FLAG_UPDATE",
      "CITY_VIEW",
      "CITY_CREATE",
      "CITY_UPDATE",
      "ROLE_VIEW",
      "PERMISSION_VIEW",
      "ROLE_PERMISSION_UPDATE",
      "ADMIN_ROLE_ASSIGN",
      "ADMIN_ROLE_REMOVE",
      "FULL_ACCESS",
      "SERVICE_REQUEST_VIEW",
      "BOOKING_VIEW",
      "FEATURED_WORKER_MANAGE",
      "FRAUD_SIGNAL_VIEW",
      "FRAUD_SIGNAL_ACTION",
      "SYSTEM_HEALTH_VIEW",
      "CONTENT_VIEW",
      "NOTIFICATION_BROADCAST",
      "ANALYTICS_VIEW_MARKETPLACE"
    ])).max(50)
  })
  .strict();

const AssignAdminRoleBody = z
  .object({
    roleKey: z.enum(["MODERATOR", "SUPPORT", "ADMIN", "SUPER_ADMIN"])
  })
  .strict();

const RemoveAdminRoleParams = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid()
});

const AdminServiceRequestsQuery = PaginationQuery.extend({
  status: z.enum(["OPEN", "MATCHED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"]).optional(),
  tradeCategoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const ServiceRequestIdParams = z.object({
  requestId: z.string().uuid()
});

const AdminBookingsQuery = PaginationQuery.extend({
  status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULED"]).optional(),
  workerId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const BookingIdParams = z.object({
  bookingId: z.string().uuid()
});

const FeaturedWorkersQuery = PaginationQuery.extend({
  isFeatured: z.coerce.boolean().optional(),
  q: z.string().max(200).optional()
});

const FeaturedWorkerActionBody = z
  .object({
    action: z.enum(["ENABLE", "DISABLE", "EXTEND"]),
    endsAt: z.string().datetime().optional(),
    notes: z.string().min(5).max(500)
  })
  .strict()
  .refine((data) => data.action !== "EXTEND" || data.endsAt !== undefined, {
    message: "endsAt required for EXTEND action"
  });

const AdminFraudSignalsQuery = PaginationQuery.extend({
  status: z.enum(["OPEN", "REVIEWED", "DISMISSED", "ACTIONED"]).optional(),
  signalKey: z.string().max(120).optional(),
  userId: z.string().uuid().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const SignalIdParams = z.object({
  signalId: z.string().uuid()
});

const FraudSignalActionBody = z
  .object({
    action: z.enum(["REVIEW", "DISMISS", "ACTION"]),
    notes: z.string().max(2000).optional(),
    moderationCaseId: z.string().uuid().optional()
  })
  .strict()
  .refine((data) => data.action !== "ACTION" || Boolean(data.notes), {
    message: "notes required when actioning a fraud signal"
  });

const ContentViewerParams = z.object({
  entityType: z.enum(["post", "comment", "review", "message"]),
  entityId: z.string().uuid()
});

const BroadcastNotificationBody = z
  .object({
    targetAudience: z.enum(["ALL_USERS", "ALL_WORKERS", "CITY", "TRADE"]),
    targetId: z.string().uuid().optional(),
    title: z.string().min(5).max(100).trim(),
    body: z.string().min(10).max(500),
    channel: z.enum(["IN_APP", "PUSH", "EMAIL"]),
    scheduledAt: z.string().datetime().optional()
  })
  .strict()
  .refine((data) => !["CITY", "TRADE"].includes(data.targetAudience) || Boolean(data.targetId), {
    message: "targetId required for CITY or TRADE audience"
  });

export {
  AddModerationActionBody,
  AdminAnalyticsQuery,
  AdminAuditLogQuery,
  AdminBookingsQuery,
  AdminCitiesQuery,
  AdminFraudSignalsQuery,
  AdminListModerationCasesQuery,
  AdminListReportsQuery,
  AdminListSupportTicketsQuery,
  AdminListUsersQuery,
  AdminListWorkersQuery,
  AdminPostsQuery,
  AdminServiceRequestsQuery,
  AdminUserIdParams,
  AdminWorkerIdParams,
  AssignAdminRoleBody,
  AssignTicketBody,
  BookingIdParams,
  BroadcastNotificationBody,
  CityIdParams,
  CommentIdParams,
  ConfigKeyParams,
  ContentViewerParams,
  CreateCityBody,
  FeaturedWorkerActionBody,
  FeaturedWorkersQuery,
  FlagKeyParams,
  FraudSignalActionBody,
  ModerationCaseIdParams,
  PostIdParams,
  ReactivateUserBody,
  RejectVerificationBody,
  RemoveAdminRoleParams,
  ReportIdParams,
  ReviewIdParams,
  RoleIdParams,
  ServiceRequestIdParams,
  SignalIdParams,
  SuspendUserBody,
  TicketIdParams,
  UpdateCityBody,
  UpdateConfigBody,
  UpdateFeatureFlagBody,
  UpdateRolePermissionsBody,
  UpdateTicketStatusBody,
  VerifyWorkerBody
};
