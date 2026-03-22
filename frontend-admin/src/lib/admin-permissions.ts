import type { AdminRoleKey } from "@/types/auth";

const ROLE_PERMISSIONS: Record<AdminRoleKey, string[]> = {
  MODERATOR: [
    "USER_VIEW",
    "WORKER_VIEW",
    "POST_DELETE",
    "COMMENT_DELETE",
    "REVIEW_DELETE",
    "REPORT_VIEW",
    "REPORT_UPDATE",
    "MODERATION_CASE_ASSIGN",
    "MODERATION_CASE_ACTION",
    "ANALYTICS_VIEW_ENGAGEMENT",
    "FRAUD_SIGNAL_VIEW",
    "CONTENT_VIEW"
  ],
  SUPPORT: ["USER_VIEW", "WORKER_VIEW", "SUPPORT_TICKET_VIEW", "SUPPORT_TICKET_ASSIGN", "SUPPORT_TICKET_RESPOND"],
  ADMIN: [
    "USER_VIEW",
    "USER_SUSPEND",
    "USER_REACTIVATE",
    "USER_SESSION_REVOKE",
    "WORKER_VIEW",
    "WORKER_VERIFY",
    "WORKER_REJECT_VERIFICATION",
    "POST_DELETE",
    "COMMENT_DELETE",
    "REVIEW_DELETE",
    "REPORT_VIEW",
    "REPORT_UPDATE",
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
    "SERVICE_REQUEST_VIEW",
    "BOOKING_VIEW",
    "FEATURED_WORKER_MANAGE",
    "FRAUD_SIGNAL_VIEW",
    "FRAUD_SIGNAL_ACTION",
    "SYSTEM_HEALTH_VIEW",
    "CONTENT_VIEW",
    "NOTIFICATION_BROADCAST",
    "ANALYTICS_VIEW_MARKETPLACE"
  ],
  SUPER_ADMIN: ["FULL_ACCESS"]
};

const getPermissionsForRoles = (roles: AdminRoleKey[]) => {
  if (roles.includes("SUPER_ADMIN")) {
    return new Set<string>(["FULL_ACCESS"]);
  }

  return new Set<string>(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []));
};

const hasPermission = (roles: AdminRoleKey[], permission?: string) => {
  if (!permission) {
    return true;
  }

  const permissions = getPermissionsForRoles(roles);
  return permissions.has("FULL_ACCESS") || permissions.has(permission);
};

export { getPermissionsForRoles, hasPermission };
