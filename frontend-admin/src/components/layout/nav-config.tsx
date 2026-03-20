import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Flag,
  Gavel,
  HardHat,
  HeadphonesIcon,
  LayoutDashboard,
  MapPinned,
  PanelRightOpen,
  ScrollText,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  SquareUser,
  Star,
  UserCog,
  Users
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  permission?: string;
  icon: LucideIcon;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", path: "/overview", permission: "ANALYTICS_VIEW_OVERVIEW", icon: LayoutDashboard }]
  },
  {
    label: "Users",
    items: [{ label: "Users List", path: "/users", permission: "USER_VIEW", icon: Users }]
  },
  {
    label: "Workers",
    items: [
      { label: "Workers List", path: "/workers", permission: "WORKER_VIEW", icon: HardHat },
      { label: "Verification Queue", path: "/verification", permission: "WORKER_VERIFY", icon: ShieldAlert },
      { label: "Featured Workers", path: "/featured-workers", permission: "FEATURED_WORKER_MANAGE", icon: Star }
    ]
  },
  {
    label: "Marketplace",
    items: [
      { label: "Service Requests", path: "/service-requests", permission: "SERVICE_REQUEST_VIEW", icon: BriefcaseBusiness },
      { label: "Bookings", path: "/bookings", permission: "BOOKING_VIEW", icon: Sparkles }
    ]
  },
  {
    label: "Moderation",
    items: [
      { label: "Content Operations", path: "/content", permission: "CONTENT_VIEW", icon: PanelRightOpen },
      { label: "Reports Queue", path: "/reports", permission: "REPORT_VIEW", icon: Flag },
      { label: "Moderation Cases", path: "/moderation-cases", permission: "REPORT_VIEW", icon: Gavel },
      { label: "Fraud Signals", path: "/fraud-signals", permission: "FRAUD_SIGNAL_VIEW", icon: ShieldAlert }
    ]
  },
  {
    label: "Support",
    items: [{ label: "Support Tickets", path: "/support-tickets", permission: "SUPPORT_TICKET_VIEW", icon: HeadphonesIcon }]
  },
  {
    label: "Analytics",
    items: [
      { label: "Search Analytics", path: "/analytics/search", permission: "ANALYTICS_VIEW_SEARCH", icon: Search },
      { label: "Engagement Analytics", path: "/analytics/engagement", permission: "ANALYTICS_VIEW_ENGAGEMENT", icon: BarChart3 },
      { label: "Marketplace Analytics", path: "/analytics/marketplace", permission: "ANALYTICS_VIEW_MARKETPLACE", icon: BriefcaseBusiness }
    ]
  },
  {
    label: "Configuration",
    items: [
      { label: "Configurations", path: "/configs", permission: "CONFIG_VIEW", icon: Settings2 },
      { label: "Feature Flags", path: "/feature-flags", permission: "FEATURE_FLAG_VIEW", icon: Sparkles },
      { label: "Cities", path: "/cities", permission: "CITY_VIEW", icon: MapPinned },
      { label: "Access Control", path: "/access-control", permission: "ROLE_VIEW", icon: UserCog },
      { label: "Audit Logs", path: "/audit-logs", permission: "AUDIT_LOG_VIEW", icon: ScrollText }
    ]
  },
  {
    label: "System",
    items: [
      { label: "Notifications", path: "/notifications", icon: BellRing },
      { label: "My Profile", path: "/profile", icon: SquareUser },
      { label: "System Health", path: "/system-health", permission: "SYSTEM_HEALTH_VIEW", icon: Activity }
    ]
  }
];

const staticPageTitleMap = new Map<string, string>(navSections.flatMap((section) => section.items.map((item) => [item.path, item.label] as const)));

const dynamicPageTitles: Array<{ matcher: RegExp; title: string }> = [
  { matcher: /^\/users\/[^/]+$/, title: "User Detail" },
  { matcher: /^\/workers\/[^/]+$/, title: "Worker Detail" },
  { matcher: /^\/service-requests\/[^/]+$/, title: "Service Request Detail" },
  { matcher: /^\/bookings\/[^/]+$/, title: "Booking Detail" },
  { matcher: /^\/reports\/[^/]+$/, title: "Report Detail" },
  { matcher: /^\/moderation-cases\/[^/]+$/, title: "Moderation Case Detail" }
];

const resolvePageTitle = (pathname: string) => {
  const staticTitle = staticPageTitleMap.get(pathname);

  if (staticTitle) {
    return staticTitle;
  }

  const dynamicTitle = dynamicPageTitles.find((entry) => entry.matcher.test(pathname));
  return dynamicTitle?.title ?? "Admin";
};

export { navSections, resolvePageTitle };
