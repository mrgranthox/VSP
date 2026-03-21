import { type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PermissionGate } from "@/components/admin/permission-gate";
import { AdminShell } from "@/components/layout/admin-shell";
import { RequireAuth } from "@/features/auth/require-auth";
import { AccessControlPage } from "@/pages/admin-access-pages";
import {
  CitiesPage,
  ConfigsPage,
  EngagementAnalyticsPage,
  FeatureFlagsPage,
  MarketplaceAnalyticsPage,
  SearchAnalyticsPage
} from "@/pages/admin-config-pages";
import {
  BookingDetailPage,
  ContentViewerPage,
  ModerationCaseDetailPage,
  ReportDetailPage,
  ServiceRequestDetailPage,
  SupportTicketDetailPage,
  UserDetailPage,
  VerificationReviewPage,
  WorkerDetailPage,
  WorkerSubscriptionPage
} from "@/pages/admin-detail-pages";
import { ContentOperationsPage } from "@/pages/admin-content-pages";
import { BookingsPage, ServiceRequestsPage } from "@/pages/admin-marketplace-pages";
import { FeaturedWorkersPage, UsersPage, VerificationQueuePage, WorkersPage } from "@/pages/admin-people-pages";
import { AuditLogsPage, FraudSignalsPage, ModerationCasesPage, ReportsPage, SupportTicketsPage, SystemHealthPage } from "@/pages/admin-ops-pages";
import { LoginPage } from "@/pages/login-page";
import { NotificationsPage } from "@/pages/notifications-page";
import { OverviewPage } from "@/pages/overview-page";
import { PasswordResetPage } from "@/pages/password-reset-page";
import { ProfilePage } from "@/pages/profile-page";
import { SessionStatePage } from "@/pages/session-state-page";

const protectedElement = (element: ReactNode, permission?: string) => <PermissionGate permission={permission}>{element}</PermissionGate>;

const AppRoutes = () => (
  <Routes>
    <Route element={<LoginPage />} path="/login" />
    <Route element={<PasswordResetPage />} path="/password-reset" />
    <Route element={<SessionStatePage mode="expired" />} path="/session-expired" />
    <Route element={<SessionStatePage mode="denied" />} path="/access-denied" />

    <Route element={<RequireAuth />}>
      <Route element={<AdminShell />}>
        <Route element={<Navigate replace to="/overview" />} index />
        <Route element={protectedElement(<OverviewPage />, "ANALYTICS_VIEW_OVERVIEW")} path="/overview" />
        <Route element={protectedElement(<OverviewPage />, "ANALYTICS_VIEW_OVERVIEW")} path="/analytics/overview" />
        <Route element={protectedElement(<NotificationsPage />)} path="/notifications" />
        <Route element={protectedElement(<NotificationsPage />, "NOTIFICATION_BROADCAST")} path="/notifications/broadcast" />
        <Route element={protectedElement(<ProfilePage />)} path="/profile" />
        <Route element={protectedElement(<ProfilePage />)} path="/profile/mfa" />
        <Route element={protectedElement(<UsersPage />, "USER_VIEW")} path="/users" />
        <Route element={protectedElement(<UserDetailPage />, "USER_VIEW")} path="/users/:userId" />
        <Route element={protectedElement(<UserDetailPage />, "USER_SUSPEND")} path="/users/:userId/suspend" />
        <Route element={protectedElement(<UserDetailPage />, "USER_REACTIVATE")} path="/users/:userId/reactivate" />
        <Route element={protectedElement(<AccessControlPage />, "ADMIN_ROLE_ASSIGN")} path="/users/:userId/roles" />
        <Route element={protectedElement(<WorkersPage />, "WORKER_VIEW")} path="/workers" />
        <Route element={protectedElement(<WorkerDetailPage />, "WORKER_VIEW")} path="/workers/:workerId" />
        <Route element={protectedElement(<VerificationQueuePage />, "WORKER_VERIFY")} path="/verification" />
        <Route element={protectedElement(<VerificationReviewPage />, "WORKER_VERIFY")} path="/verification/:workerId" />
        <Route element={protectedElement(<VerificationReviewPage />, "WORKER_VERIFY")} path="/workers/:workerId/verify" />
        <Route element={protectedElement(<VerificationReviewPage />, "WORKER_REJECT_VERIFICATION")} path="/workers/:workerId/reject-verification" />
        <Route element={protectedElement(<VerificationReviewPage />, "WORKER_VERIFY")} path="/workers/:workerId/verification-documents" />
        <Route element={protectedElement(<FeaturedWorkersPage />, "FEATURED_WORKER_MANAGE")} path="/featured-workers" />
        <Route element={protectedElement(<WorkerSubscriptionPage />, "FEATURED_WORKER_MANAGE")} path="/workers/:workerId/subscription" />
        <Route element={protectedElement(<WorkerSubscriptionPage />, "FEATURED_WORKER_MANAGE")} path="/workers/:workerId/featured" />
        <Route element={protectedElement(<ServiceRequestsPage />, "SERVICE_REQUEST_VIEW")} path="/service-requests" />
        <Route element={protectedElement(<ServiceRequestDetailPage />, "SERVICE_REQUEST_VIEW")} path="/service-requests/:requestId" />
        <Route element={protectedElement(<ServiceRequestDetailPage />, "SERVICE_REQUEST_VIEW")} path="/service-requests/:requestId/assignments" />
        <Route element={protectedElement(<ServiceRequestDetailPage />, "SERVICE_REQUEST_VIEW")} path="/service-requests/:requestId/booking" />
        <Route element={protectedElement(<BookingsPage />, "BOOKING_VIEW")} path="/bookings" />
        <Route element={protectedElement(<BookingDetailPage />, "BOOKING_VIEW")} path="/bookings/:bookingId" />
        <Route element={protectedElement(<BookingDetailPage />, "BOOKING_VIEW")} path="/bookings/:bookingId/review" />
        <Route element={protectedElement(<BookingDetailPage />, "BOOKING_VIEW")} path="/bookings/:bookingId/timeline" />
        <Route element={protectedElement(<ContentOperationsPage />, "CONTENT_VIEW")} path="/content" />
        <Route element={protectedElement(<ContentViewerPage />, "CONTENT_VIEW")} path="/content/:entityType/:entityId" />
        <Route element={protectedElement(<ContentViewerPage />, "CONTENT_VIEW")} path="/content/:entityType/:entityId/delete" />
        <Route element={protectedElement(<ReportsPage />, "REPORT_VIEW")} path="/reports" />
        <Route element={protectedElement(<ReportDetailPage />, "REPORT_VIEW")} path="/reports/:reportId" />
        <Route element={protectedElement(<ReportDetailPage />, "REPORT_VIEW")} path="/reports/:reportId/content" />
        <Route element={protectedElement(<ModerationCasesPage />, "REPORT_VIEW")} path="/moderation-cases" />
        <Route element={protectedElement(<ModerationCaseDetailPage />, "REPORT_VIEW")} path="/moderation-cases/:caseId" />
        <Route element={protectedElement(<ModerationCaseDetailPage />, "MODERATION_CASE_ACTION")} path="/moderation-cases/:caseId/actions/new" />
        <Route element={protectedElement(<ModerationCaseDetailPage />, "REPORT_VIEW")} path="/moderation-cases/:caseId/content" />
        <Route element={protectedElement(<FraudSignalsPage />, "FRAUD_SIGNAL_VIEW")} path="/fraud-signals" />
        <Route element={protectedElement(<FraudSignalsPage />, "FRAUD_SIGNAL_VIEW")} path="/fraud-signals/:signalId" />
        <Route element={protectedElement(<SupportTicketsPage />, "SUPPORT_TICKET_VIEW")} path="/support-tickets" />
        <Route element={protectedElement(<SupportTicketDetailPage />, "SUPPORT_TICKET_VIEW")} path="/support-tickets/:ticketId" />
        <Route element={protectedElement(<SupportTicketDetailPage />, "SUPPORT_TICKET_RESPOND")} path="/support-tickets/:ticketId/reply" />
        <Route element={protectedElement(<SupportTicketDetailPage />, "SUPPORT_TICKET_ASSIGN")} path="/support-tickets/:ticketId/assign" />
        <Route element={protectedElement(<SupportTicketDetailPage />, "SUPPORT_TICKET_ASSIGN")} path="/support-tickets/:ticketId/status" />
        <Route element={protectedElement(<SearchAnalyticsPage />, "ANALYTICS_VIEW_SEARCH")} path="/analytics/search" />
        <Route element={protectedElement(<EngagementAnalyticsPage />, "ANALYTICS_VIEW_ENGAGEMENT")} path="/analytics/engagement" />
        <Route element={protectedElement(<MarketplaceAnalyticsPage />, "ANALYTICS_VIEW_MARKETPLACE")} path="/analytics/marketplace" />
        <Route element={protectedElement(<ConfigsPage />, "CONFIG_VIEW")} path="/configs" />
        <Route element={protectedElement(<ConfigsPage />, "CONFIG_UPDATE")} path="/configs/:configKey" />
        <Route element={protectedElement(<FeatureFlagsPage />, "FEATURE_FLAG_VIEW")} path="/feature-flags" />
        <Route element={protectedElement(<FeatureFlagsPage />, "FEATURE_FLAG_UPDATE")} path="/feature-flags/:flagKey" />
        <Route element={protectedElement(<CitiesPage />, "CITY_VIEW")} path="/cities" />
        <Route element={protectedElement(<CitiesPage />, "CITY_UPDATE")} path="/cities/:cityId" />
        <Route element={protectedElement(<AccessControlPage />, "ROLE_VIEW")} path="/access-control" />
        <Route element={protectedElement(<AccessControlPage />, "PERMISSION_VIEW")} path="/access-control/permissions" />
        <Route element={protectedElement(<AccessControlPage />, "ROLE_PERMISSION_UPDATE")} path="/roles/:roleId/permissions" />
        <Route element={protectedElement(<AuditLogsPage />, "AUDIT_LOG_VIEW")} path="/audit-logs" />
        <Route element={protectedElement(<AuditLogsPage />, "AUDIT_LOG_VIEW")} path="/audit-logs/:auditLogId" />
        <Route element={protectedElement(<SystemHealthPage />, "SYSTEM_HEALTH_VIEW")} path="/system-health" />
        <Route element={protectedElement(<SystemHealthPage />, "SYSTEM_HEALTH_VIEW")} path="/system-health/jobs/:jobId" />
        <Route element={protectedElement(<SystemHealthPage />, "SYSTEM_HEALTH_VIEW")} path="/system-health/metrics" />
      </Route>
    </Route>

    <Route element={<Navigate replace to="/overview" />} path="*" />
  </Routes>
);

export { AppRoutes };
