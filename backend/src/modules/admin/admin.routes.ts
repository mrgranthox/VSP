import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { requireMfa, requirePermission } from "./admin.guard";
import { adminController } from "./admin.controller";
import {
  AddModerationActionBody,
  AddSupportTicketMessageBody,
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
  BulkFraudSignalActionBody,
  BulkModerationActionBody,
  BulkUpdateReportsBody,
  BulkUpdateSupportTicketsBody,
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
  AdminUserSessionParams,
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
} from "./admin.schemas";

const adminRoutes = Router();

adminRoutes.use("/admin", authenticate);

adminRoutes.get("/admin/users", requirePermission("USER_VIEW"), validate(AdminListUsersQuery, "query"), adminController.listUsers);
adminRoutes.get("/admin/users/:userId", requirePermission("USER_VIEW"), validate(AdminUserIdParams, "params"), adminController.getUser);
adminRoutes.post(
  "/admin/users/:userId/suspend",
  requirePermission("USER_SUSPEND"),
  requireMfa,
  validate(AdminUserIdParams, "params"),
  validate(SuspendUserBody),
  adminController.suspendUser
);
adminRoutes.post(
  "/admin/users/:userId/reactivate",
  requirePermission("USER_REACTIVATE"),
  validate(AdminUserIdParams, "params"),
  validate(ReactivateUserBody),
  adminController.reactivateUser
);
adminRoutes.post(
  "/admin/users/:userId/sessions/:sessionId/revoke",
  requirePermission("USER_SESSION_REVOKE"),
  validate(AdminUserSessionParams, "params"),
  adminController.revokeUserSession
);
adminRoutes.post(
  "/admin/users/:userId/sessions/revoke-all",
  requirePermission("USER_SESSION_REVOKE"),
  validate(AdminUserIdParams, "params"),
  adminController.revokeAllUserSessions
);

adminRoutes.get("/admin/workers", requirePermission("WORKER_VIEW"), validate(AdminListWorkersQuery, "query"), adminController.listWorkers);
adminRoutes.get("/admin/workers/:workerId", requirePermission("WORKER_VIEW"), validate(AdminWorkerIdParams, "params"), adminController.getWorker);
adminRoutes.post(
  "/admin/workers/:workerId/verify",
  requirePermission("WORKER_VERIFY"),
  requireMfa,
  validate(AdminWorkerIdParams, "params"),
  validate(VerifyWorkerBody),
  adminController.verifyWorker
);
adminRoutes.post(
  "/admin/workers/:workerId/reject-verification",
  requirePermission("WORKER_REJECT_VERIFICATION"),
  requireMfa,
  validate(AdminWorkerIdParams, "params"),
  validate(RejectVerificationBody),
  adminController.rejectWorker
);
adminRoutes.get(
  "/admin/workers/:workerId/verification-documents",
  requirePermission("WORKER_VERIFY"),
  validate(AdminWorkerIdParams, "params"),
  adminController.getWorkerVerificationDocuments
);
adminRoutes.get(
  "/admin/workers/:workerId/subscription",
  requirePermission("FEATURED_WORKER_MANAGE"),
  validate(AdminWorkerIdParams, "params"),
  adminController.getWorkerSubscription
);
adminRoutes.patch(
  "/admin/workers/:workerId/subscription",
  requirePermission("FEATURED_WORKER_MANAGE"),
  validate(AdminWorkerIdParams, "params"),
  validate(FeaturedWorkerActionBody),
  adminController.updateWorkerSubscription
);

adminRoutes.get("/admin/posts", requirePermission("POST_DELETE"), validate(AdminPostsQuery, "query"), adminController.listPosts);
adminRoutes.delete("/admin/posts/:postId", requirePermission("POST_DELETE"), validate(PostIdParams, "params"), adminController.deletePost);
adminRoutes.delete(
  "/admin/comments/:commentId",
  requirePermission("COMMENT_DELETE"),
  validate(CommentIdParams, "params"),
  adminController.deleteComment
);
adminRoutes.delete(
  "/admin/reviews/:reviewId",
  requirePermission("REVIEW_DELETE"),
  validate(ReviewIdParams, "params"),
  adminController.deleteReview
);

adminRoutes.get("/admin/reports", requirePermission("REPORT_VIEW"), validate(AdminListReportsQuery, "query"), adminController.listReports);
adminRoutes.get(
  "/admin/reports/export",
  requirePermission("REPORT_VIEW"),
  validate(AdminListReportsQuery, "query"),
  adminController.exportReports
);
adminRoutes.patch(
  "/admin/reports/bulk",
  requirePermission("REPORT_UPDATE"),
  validate(BulkUpdateReportsBody),
  adminController.bulkUpdateReports
);
adminRoutes.get("/admin/reports/:reportId", requirePermission("REPORT_VIEW"), validate(ReportIdParams, "params"), adminController.getReport);
adminRoutes.get(
  "/admin/moderation-cases",
  requirePermission("REPORT_VIEW"),
  validate(AdminListModerationCasesQuery, "query"),
  adminController.listModerationCases
);
adminRoutes.get(
  "/admin/moderation-cases/export",
  requirePermission("REPORT_VIEW"),
  validate(AdminListModerationCasesQuery, "query"),
  adminController.exportModerationCases
);
adminRoutes.post(
  "/admin/moderation-cases/bulk-actions",
  requirePermission("MODERATION_CASE_ACTION"),
  validate(BulkModerationActionBody),
  adminController.bulkAddModerationActions
);
adminRoutes.get(
  "/admin/moderation-cases/:caseId",
  requirePermission("REPORT_VIEW"),
  validate(ModerationCaseIdParams, "params"),
  adminController.getModerationCase
);
adminRoutes.post(
  "/admin/moderation-cases/:caseId/actions",
  requirePermission("MODERATION_CASE_ACTION"),
  validate(ModerationCaseIdParams, "params"),
  validate(AddModerationActionBody),
  adminController.addModerationAction
);

adminRoutes.get(
  "/admin/support-tickets",
  requirePermission("SUPPORT_TICKET_VIEW"),
  validate(AdminListSupportTicketsQuery, "query"),
  adminController.listSupportTickets
);
adminRoutes.get(
  "/admin/support-tickets/export",
  requirePermission("SUPPORT_TICKET_VIEW"),
  validate(AdminListSupportTicketsQuery, "query"),
  adminController.exportSupportTickets
);
adminRoutes.get(
  "/admin/support-tickets/:ticketId",
  requirePermission("SUPPORT_TICKET_VIEW"),
  validate(TicketIdParams, "params"),
  adminController.getSupportTicket
);
adminRoutes.patch(
  "/admin/support-tickets/bulk",
  requirePermission("SUPPORT_TICKET_ASSIGN"),
  validate(BulkUpdateSupportTicketsBody),
  adminController.bulkUpdateSupportTickets
);
adminRoutes.post(
  "/admin/support-tickets/:ticketId/messages",
  requirePermission("SUPPORT_TICKET_RESPOND"),
  validate(TicketIdParams, "params"),
  validate(AddSupportTicketMessageBody),
  adminController.addSupportTicketMessage
);
adminRoutes.patch(
  "/admin/support-tickets/:ticketId/assign",
  requirePermission("SUPPORT_TICKET_ASSIGN"),
  validate(TicketIdParams, "params"),
  validate(AssignTicketBody),
  adminController.assignSupportTicket
);
adminRoutes.patch(
  "/admin/support-tickets/:ticketId/status",
  requirePermission("SUPPORT_TICKET_ASSIGN"),
  validate(TicketIdParams, "params"),
  validate(UpdateTicketStatusBody),
  adminController.updateSupportTicketStatus
);

adminRoutes.get("/admin/audit-logs", requirePermission("AUDIT_LOG_VIEW"), validate(AdminAuditLogQuery, "query"), adminController.listAuditLogs);
adminRoutes.get(
  "/admin/audit-logs/export",
  requirePermission("AUDIT_LOG_VIEW"),
  validate(AdminAuditLogQuery, "query"),
  adminController.exportAuditLogs
);
adminRoutes.get(
  "/admin/analytics/overview",
  requirePermission("ANALYTICS_VIEW_OVERVIEW"),
  validate(AdminAnalyticsQuery, "query"),
  adminController.getAnalyticsOverview
);
adminRoutes.get(
  "/admin/analytics/search",
  requirePermission("ANALYTICS_VIEW_SEARCH"),
  validate(AdminAnalyticsQuery, "query"),
  adminController.getAnalyticsSearch
);
adminRoutes.get(
  "/admin/analytics/engagement",
  requirePermission("ANALYTICS_VIEW_ENGAGEMENT"),
  validate(AdminAnalyticsQuery, "query"),
  adminController.getAnalyticsEngagement
);
adminRoutes.get(
  "/admin/analytics/marketplace",
  requirePermission("ANALYTICS_VIEW_MARKETPLACE"),
  validate(AdminAnalyticsQuery, "query"),
  adminController.getMarketplaceAnalytics
);

adminRoutes.get("/admin/configs", requirePermission("CONFIG_VIEW"), adminController.listConfigs);
adminRoutes.patch(
  "/admin/configs/:configKey",
  requirePermission("CONFIG_UPDATE"),
  requireMfa,
  validate(ConfigKeyParams, "params"),
  validate(UpdateConfigBody),
  adminController.updateConfig
);
adminRoutes.get("/admin/feature-flags", requirePermission("FEATURE_FLAG_VIEW"), adminController.listFeatureFlags);
adminRoutes.patch(
  "/admin/feature-flags/:flagKey",
  requirePermission("FEATURE_FLAG_UPDATE"),
  validate(FlagKeyParams, "params"),
  validate(UpdateFeatureFlagBody),
  adminController.updateFeatureFlag
);

adminRoutes.get("/admin/cities", requirePermission("CITY_VIEW"), validate(AdminCitiesQuery, "query"), adminController.listCities);
adminRoutes.post("/admin/cities", requirePermission("CITY_CREATE"), validate(CreateCityBody), adminController.createCity);
adminRoutes.patch(
  "/admin/cities/:cityId",
  requirePermission("CITY_UPDATE"),
  validate(CityIdParams, "params"),
  validate(UpdateCityBody),
  adminController.updateCity
);

adminRoutes.get("/admin/roles", requirePermission("ROLE_VIEW"), adminController.listRoles);
adminRoutes.get("/admin/permissions", requirePermission("PERMISSION_VIEW"), adminController.listPermissions);
adminRoutes.patch(
  "/admin/roles/:roleId/permissions",
  requirePermission("ROLE_PERMISSION_UPDATE"),
  requireMfa,
  validate(RoleIdParams, "params"),
  validate(UpdateRolePermissionsBody),
  adminController.updateRolePermissions
);
adminRoutes.post(
  "/admin/users/:userId/roles",
  requirePermission("ADMIN_ROLE_ASSIGN"),
  requireMfa,
  validate(AdminUserIdParams, "params"),
  validate(AssignAdminRoleBody),
  adminController.assignAdminRole
);
adminRoutes.delete(
  "/admin/users/:userId/roles/:roleId",
  requirePermission("ADMIN_ROLE_REMOVE"),
  requireMfa,
  validate(RemoveAdminRoleParams, "params"),
  adminController.removeAdminRole
);

adminRoutes.get(
  "/admin/service-requests",
  requirePermission("SERVICE_REQUEST_VIEW"),
  validate(AdminServiceRequestsQuery, "query"),
  adminController.listServiceRequests
);
adminRoutes.get(
  "/admin/service-requests/:requestId",
  requirePermission("SERVICE_REQUEST_VIEW"),
  validate(ServiceRequestIdParams, "params"),
  adminController.getServiceRequest
);
adminRoutes.get("/admin/bookings", requirePermission("BOOKING_VIEW"), validate(AdminBookingsQuery, "query"), adminController.listBookings);
adminRoutes.get("/admin/bookings/:bookingId", requirePermission("BOOKING_VIEW"), validate(BookingIdParams, "params"), adminController.getBooking);

adminRoutes.get(
  "/admin/featured-workers",
  requirePermission("FEATURED_WORKER_MANAGE"),
  validate(FeaturedWorkersQuery, "query"),
  adminController.listFeaturedWorkers
);
adminRoutes.patch(
  "/admin/featured-workers/:workerId",
  requirePermission("FEATURED_WORKER_MANAGE"),
  validate(AdminWorkerIdParams, "params"),
  validate(FeaturedWorkerActionBody),
  adminController.actionFeaturedWorker
);

adminRoutes.get(
  "/admin/fraud-signals",
  requirePermission("FRAUD_SIGNAL_VIEW"),
  validate(AdminFraudSignalsQuery, "query"),
  adminController.listFraudSignals
);
adminRoutes.get(
  "/admin/fraud-signals/export",
  requirePermission("FRAUD_SIGNAL_VIEW"),
  validate(AdminFraudSignalsQuery, "query"),
  adminController.exportFraudSignals
);
adminRoutes.patch(
  "/admin/fraud-signals/bulk",
  requirePermission("FRAUD_SIGNAL_ACTION"),
  validate(BulkFraudSignalActionBody),
  adminController.bulkActionFraudSignals
);
adminRoutes.patch(
  "/admin/fraud-signals/:signalId",
  requirePermission("FRAUD_SIGNAL_ACTION"),
  validate(SignalIdParams, "params"),
  validate(FraudSignalActionBody),
  adminController.actionFraudSignal
);

adminRoutes.get(
  "/admin/content/:entityType/:entityId",
  requirePermission("CONTENT_VIEW"),
  validate(ContentViewerParams, "params"),
  adminController.getContent
);
adminRoutes.get("/admin/system/health", requirePermission("SYSTEM_HEALTH_VIEW"), adminController.getSystemHealth);
adminRoutes.get("/admin/system/metrics", requirePermission("SYSTEM_HEALTH_VIEW"), adminController.getSystemMetrics);
adminRoutes.post(
  "/admin/notifications/broadcast",
  requirePermission("NOTIFICATION_BROADCAST"),
  requireMfa,
  validate(BroadcastNotificationBody),
  adminController.broadcastNotification
);

export { adminRoutes };
