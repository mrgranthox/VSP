import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PermissionGate } from "@/components/admin/permission-gate";
import { AdminShell } from "@/components/layout/admin-shell";
import { RequireAuth } from "@/features/auth/require-auth";

const lazyPage = (loader: () => Promise<{ default: ComponentType<any> }>) => lazy(loader);

const LoginPage = lazyPage(() => import("@/pages/login-page").then((module) => ({ default: module.LoginPage })));
const PasswordResetPage = lazyPage(() => import("@/pages/password-reset-page").then((module) => ({ default: module.PasswordResetPage })));
const SessionStatePage = lazyPage(() => import("@/pages/session-state-page").then((module) => ({ default: module.SessionStatePage })));
const OverviewPage = lazyPage(() => import("@/pages/overview-page").then((module) => ({ default: module.OverviewPage })));
const NotificationsPage = lazyPage(() => import("@/pages/notifications-page").then((module) => ({ default: module.NotificationsPage })));
const ProfilePage = lazyPage(() => import("@/pages/profile-page").then((module) => ({ default: module.ProfilePage })));
const ContentOperationsPage = lazyPage(() => import("@/pages/admin-content-pages").then((module) => ({ default: module.ContentOperationsPage })));

const UsersPage = lazyPage(() => import("@/pages/admin-people-pages").then((module) => ({ default: module.UsersPage })));
const WorkersPage = lazyPage(() => import("@/pages/admin-people-pages").then((module) => ({ default: module.WorkersPage })));
const VerificationQueuePage = lazyPage(() => import("@/pages/admin-people-pages").then((module) => ({ default: module.VerificationQueuePage })));
const FeaturedWorkersPage = lazyPage(() => import("@/pages/admin-people-pages").then((module) => ({ default: module.FeaturedWorkersPage })));

const ServiceRequestsPage = lazyPage(() => import("@/pages/admin-marketplace-pages").then((module) => ({ default: module.ServiceRequestsPage })));
const BookingsPage = lazyPage(() => import("@/pages/admin-marketplace-pages").then((module) => ({ default: module.BookingsPage })));

const ReportsPage = lazyPage(() => import("@/pages/admin-ops-pages").then((module) => ({ default: module.ReportsPage })));
const ModerationCasesPage = lazyPage(() => import("@/pages/admin-ops-pages").then((module) => ({ default: module.ModerationCasesPage })));
const FraudSignalsPage = lazyPage(() => import("@/pages/admin-ops-pages").then((module) => ({ default: module.FraudSignalsPage })));
const SupportTicketsPage = lazyPage(() => import("@/pages/admin-ops-pages").then((module) => ({ default: module.SupportTicketsPage })));
const AuditLogsPage = lazyPage(() => import("@/pages/admin-ops-pages").then((module) => ({ default: module.AuditLogsPage })));
const SystemHealthPage = lazyPage(() => import("@/pages/admin-ops-pages").then((module) => ({ default: module.SystemHealthPage })));

const SearchAnalyticsPage = lazyPage(() => import("@/pages/admin-config-pages").then((module) => ({ default: module.SearchAnalyticsPage })));
const EngagementAnalyticsPage = lazyPage(() => import("@/pages/admin-config-pages").then((module) => ({ default: module.EngagementAnalyticsPage })));
const MarketplaceAnalyticsPage = lazyPage(() => import("@/pages/admin-config-pages").then((module) => ({ default: module.MarketplaceAnalyticsPage })));
const ConfigsPage = lazyPage(() => import("@/pages/admin-config-pages").then((module) => ({ default: module.ConfigsPage })));
const FeatureFlagsPage = lazyPage(() => import("@/pages/admin-config-pages").then((module) => ({ default: module.FeatureFlagsPage })));
const CitiesPage = lazyPage(() => import("@/pages/admin-config-pages").then((module) => ({ default: module.CitiesPage })));

const AccessControlPage = lazyPage(() => import("@/pages/admin-access-pages").then((module) => ({ default: module.AccessControlPage })));

const SkillsPage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.SkillsPage })));
const ArticlesPage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.ArticlesPage })));
const CompanyPagesPage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.CompanyPagesPage })));
const EventsPage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.EventsPage })));
const GroupsPage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.GroupsPage })));
const HashtagsPage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.HashtagsPage })));
const SubscriptionsPage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.SubscriptionsPage })));
const OnboardingFunnelPage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.OnboardingFunnelPage })));
const ProfileCompletenessPage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.ProfileCompletenessPage })));
const ContentQueuePage = lazyPage(() => import("@/pages/admin-platform-pages").then((module) => ({ default: module.ContentQueuePage })));

const UserDetailPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.UserDetailPage })));
const WorkerDetailPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.WorkerDetailPage })));
const VerificationReviewPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.VerificationReviewPage })));
const WorkerSubscriptionPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.WorkerSubscriptionPage })));
const ServiceRequestDetailPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.ServiceRequestDetailPage })));
const BookingDetailPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.BookingDetailPage })));
const ContentViewerPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.ContentViewerPage })));
const ReportDetailPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.ReportDetailPage })));
const ModerationCaseDetailPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.ModerationCaseDetailPage })));
const SupportTicketDetailPage = lazyPage(() => import("@/pages/admin-detail-pages").then((module) => ({ default: module.SupportTicketDetailPage })));
const DevErrorBoundaryProbePage = lazyPage(() => import("@/pages/dev-error-boundary-probe").then((module) => ({ default: module.DevErrorBoundaryProbePage })));
const showDevProbeRoutes = import.meta.env.DEV;

const RouteLoadingScreen = () => (
  <div className="flex min-h-[40vh] items-center justify-center px-4 py-12">
    <div className="rounded-[1.75rem] border border-[rgba(112,104,84,0.14)] bg-[linear-gradient(135deg,rgba(255,253,248,0.96),rgba(249,244,235,0.92))] px-6 py-5 shadow-[0_18px_38px_rgba(71,61,45,0.1)]">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 animate-pulse rounded-full bg-[color:var(--jo-forest)]" />
        <p className="text-sm font-semibold text-[color:var(--jo-ink)]">Loading admin workspace</p>
      </div>
    </div>
  </div>
);

const protectedElement = (element: ReactNode, permission?: string) => <PermissionGate permission={permission}>{element}</PermissionGate>;

const AppRoutes = () => (
  <Suspense fallback={<RouteLoadingScreen />}>
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
          <Route element={protectedElement(<NotificationsPage />)} path="/notifications/:notificationId" />
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
          <Route element={protectedElement(<SkillsPage />, "CONFIG_VIEW")} path="/skills" />
          <Route element={protectedElement(<ArticlesPage />, "CONTENT_VIEW")} path="/articles" />
          <Route element={protectedElement(<CompanyPagesPage />, "WORKER_VIEW")} path="/company-pages" />
          <Route element={protectedElement(<EventsPage />, "CONTENT_VIEW")} path="/events" />
          <Route element={protectedElement(<GroupsPage />, "CONTENT_VIEW")} path="/groups" />
          <Route element={protectedElement(<HashtagsPage />, "CONTENT_VIEW")} path="/hashtags" />
          <Route element={protectedElement(<SubscriptionsPage />, "ANALYTICS_VIEW_OVERVIEW")} path="/subscriptions" />
          <Route element={protectedElement(<OnboardingFunnelPage />, "ANALYTICS_VIEW_OVERVIEW")} path="/analytics/onboarding" />
          <Route element={protectedElement(<ProfileCompletenessPage />, "ANALYTICS_VIEW_OVERVIEW")} path="/analytics/profiles" />
          <Route element={protectedElement(<ContentQueuePage />, "CONTENT_VIEW")} path="/content-queue" />
        </Route>
      </Route>

      <Route element={<Navigate replace to="/overview" />} path="*" />
      {showDevProbeRoutes ? <Route element={<DevErrorBoundaryProbePage />} path="/__test/error-boundary" /> : null}
    </Routes>
  </Suspense>
);

export { AppRoutes };
