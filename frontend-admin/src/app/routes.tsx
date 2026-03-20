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
import { BookingDetailPage, ModerationCaseDetailPage, ReportDetailPage, ServiceRequestDetailPage, UserDetailPage, WorkerDetailPage } from "@/pages/admin-detail-pages";
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
        <Route element={protectedElement(<NotificationsPage />)} path="/notifications" />
        <Route element={protectedElement(<ProfilePage />)} path="/profile" />
        <Route element={protectedElement(<UsersPage />, "USER_VIEW")} path="/users" />
        <Route element={protectedElement(<UserDetailPage />, "USER_VIEW")} path="/users/:userId" />
        <Route element={protectedElement(<WorkersPage />, "WORKER_VIEW")} path="/workers" />
        <Route element={protectedElement(<WorkerDetailPage />, "WORKER_VIEW")} path="/workers/:workerId" />
        <Route element={protectedElement(<VerificationQueuePage />, "WORKER_VERIFY")} path="/verification" />
        <Route element={protectedElement(<FeaturedWorkersPage />, "FEATURED_WORKER_MANAGE")} path="/featured-workers" />
        <Route element={protectedElement(<ServiceRequestsPage />, "SERVICE_REQUEST_VIEW")} path="/service-requests" />
        <Route element={protectedElement(<ServiceRequestDetailPage />, "SERVICE_REQUEST_VIEW")} path="/service-requests/:requestId" />
        <Route element={protectedElement(<BookingsPage />, "BOOKING_VIEW")} path="/bookings" />
        <Route element={protectedElement(<BookingDetailPage />, "BOOKING_VIEW")} path="/bookings/:bookingId" />
        <Route element={protectedElement(<ContentOperationsPage />, "CONTENT_VIEW")} path="/content" />
        <Route element={protectedElement(<ReportsPage />, "REPORT_VIEW")} path="/reports" />
        <Route element={protectedElement(<ReportDetailPage />, "REPORT_VIEW")} path="/reports/:reportId" />
        <Route element={protectedElement(<ModerationCasesPage />, "REPORT_VIEW")} path="/moderation-cases" />
        <Route element={protectedElement(<ModerationCaseDetailPage />, "REPORT_VIEW")} path="/moderation-cases/:caseId" />
        <Route element={protectedElement(<FraudSignalsPage />, "FRAUD_SIGNAL_VIEW")} path="/fraud-signals" />
        <Route element={protectedElement(<SupportTicketsPage />, "SUPPORT_TICKET_VIEW")} path="/support-tickets" />
        <Route element={protectedElement(<SearchAnalyticsPage />, "ANALYTICS_VIEW_SEARCH")} path="/analytics/search" />
        <Route element={protectedElement(<EngagementAnalyticsPage />, "ANALYTICS_VIEW_ENGAGEMENT")} path="/analytics/engagement" />
        <Route element={protectedElement(<MarketplaceAnalyticsPage />, "ANALYTICS_VIEW_MARKETPLACE")} path="/analytics/marketplace" />
        <Route element={protectedElement(<ConfigsPage />, "CONFIG_VIEW")} path="/configs" />
        <Route element={protectedElement(<FeatureFlagsPage />, "FEATURE_FLAG_VIEW")} path="/feature-flags" />
        <Route element={protectedElement(<CitiesPage />, "CITY_VIEW")} path="/cities" />
        <Route element={protectedElement(<AccessControlPage />, "ROLE_VIEW")} path="/access-control" />
        <Route element={protectedElement(<AuditLogsPage />, "AUDIT_LOG_VIEW")} path="/audit-logs" />
        <Route element={protectedElement(<SystemHealthPage />, "SYSTEM_HEALTH_VIEW")} path="/system-health" />
      </Route>
    </Route>

    <Route element={<Navigate replace to="/overview" />} path="*" />
  </Routes>
);

export { AppRoutes };
