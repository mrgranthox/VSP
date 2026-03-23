import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, FileText, ImageIcon, LifeBuoy, MessageSquareText, ShieldAlert, ShieldCheck, UserRoundCog, Users, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PermissionGate } from "@/components/admin/permission-gate";
import { EntityHero, KeyValueGrid, SectionCard, TimelineList } from "@/components/admin/detail-primitives";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCurrentAdmin } from "@/features/auth/auth";
import { apiRequest, getApiErrorMessage, isMfaRequiredError } from "@/lib/api";
import { hasPermission } from "@/lib/admin-permissions";
import { compactId, formatCurrency, formatDateTime, formatDisplayName, formatNumber, isImageMimeType, isPdfMimeType } from "@/lib/utils";
import { ContentSnapshot } from "@/pages/admin-detail-pages.shared";
import type {
  AdminActivityItem,
  AdminContentView,
  AdminModerationCaseDetail,
  AdminMediaAssetItem,
  AdminReportDetail,
  AdminUserDetail,
  AdminContentHistoryReport,
  BookingDetail,
  ServiceRequestDetail,
  SupportTicketDetail,
  SupportTicketMessageItem,
  WorkerDetail,
  WorkerSubscriptionSnapshot,
  WorkerVerificationDocuments
} from "@/types/admin";

const handleActionError = (error: unknown, fallback: string) => {
  if (isMfaRequiredError(error)) {
    toast.error("This action requires MFA verification from My Profile.");
    return;
  }

  toast.error(getApiErrorMessage(error, fallback));
};

const BackButton = ({ to, label }: { to: string; label: string }) => (
  <Link className="inline-flex" to={to}>
    <Button variant="outline">
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  </Link>
);

const resolveAdminEntityLink = (entityType?: string | null, entityId?: string | null) => {
  if (!entityType || !entityId) {
    return undefined;
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
      return `/workers/${entityId}`;
    default:
      return undefined;
  }
};

const formatDayLabel = (dayOfWeek: number) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek] ?? `Day ${dayOfWeek}`;

const emptyUserActivitySummary: AdminUserDetail["activitySummary"] = {
  posts: 0,
  comments: 0,
  postLikes: 0,
  commentLikes: 0,
  postSaves: 0,
  follows: 0,
  followers: 0,
  savedWorkers: 0,
  reports: 0,
  messages: 0,
  conversations: 0,
  notifications: 0,
  serviceRequests: 0,
  bookings: 0,
  reviewsWritten: 0,
  reviewsReceived: 0,
  supportTickets: 0,
  fraudSignals: 0,
  mediaAssets: 0
};

const emptyWorkerActivitySummary: WorkerDetail["activitySummary"] = {
  ...emptyUserActivitySummary,
  assignments: 0,
  bookingsAsWorker: 0,
  savedByUsers: 0,
  searchImpressions: 0,
  services: 0,
  serviceAreas: 0,
  certifications: 0,
  verificationRequests: 0,
  portfolioItems: 0,
  availabilityRules: 0,
  availabilityExceptions: 0,
  featuredSubscriptions: 0,
  subscriptionInvoices: 0
};

const emptyUserActivityCollections: AdminUserDetail["activityCollections"] = {
  posts: [],
  comments: [],
  postLikes: [],
  commentLikes: [],
  postSaves: [],
  follows: [],
  followers: [],
  savedWorkers: [],
  reports: [],
  messages: [],
  conversations: [],
  notifications: [],
  serviceRequests: [],
  bookings: [],
  reviewsWritten: [],
  reviewsReceived: [],
  supportTickets: [],
  fraudSignals: [],
  mediaAssets: []
};

const emptyWorkerActivityCollections: WorkerDetail["activityCollections"] = {
  ...emptyUserActivityCollections,
  assignments: [],
  bookingsAsWorker: [],
  savedByUsers: [],
  searchImpressions: []
};

const activityDomainConfig = [
  {
    key: "content",
    title: "Content",
    description: "Posts, comments, reviews, and interaction traces.",
    icon: MessageSquareText,
    matches: new Set(["POST", "COMMENT", "POST_LIKE", "COMMENT_LIKE", "REVIEW_WRITTEN", "REVIEW_RECEIVED"])
  },
  {
    key: "marketplace",
    title: "Marketplace",
    description: "Requests, bookings, assignments, follows, and search exposure.",
    icon: BriefcaseBusiness,
    matches: new Set(["SERVICE_REQUEST", "BOOKING", "ASSIGNMENT", "WORKER_BOOKING", "FOLLOW", "SEARCH_IMPRESSION"])
  },
  {
    key: "trust",
    title: "Trust & Safety",
    description: "Reports, fraud signals, and support escalations.",
    icon: ShieldAlert,
    matches: new Set(["REPORT", "FRAUD_SIGNAL", "SUPPORT_TICKET"])
  },
  {
    key: "comms",
    title: "Messaging & Alerts",
    description: "Conversations, admin notices, and operational comms.",
    icon: Users,
    matches: new Set(["MESSAGE", "NOTIFICATION"])
  },
  {
    key: "media",
    title: "Media",
    description: "Images, documents, and uploaded evidence.",
    icon: ImageIcon,
    matches: new Set(["MEDIA"])
  }
] as const;

const groupActivityIntoDomains = (items: AdminActivityItem[]) =>
  activityDomainConfig
    .map((domain) => ({
      ...domain,
      items: items.filter((item) => domain.matches.has(item.kind)).slice(0, 4)
    }))
    .filter((domain) => domain.items.length > 0);

const userCollectionGroups = [
  {
    key: "content",
    title: "Content & Engagement",
    description: "Posts, comments, likes, saves, and review activity tied to this account.",
    icon: MessageSquareText,
    items: [
      { key: "posts", label: "Posts", description: "Recent authored feed posts." },
      { key: "comments", label: "Comments", description: "Recent post or review comments." },
      { key: "postLikes", label: "Post likes", description: "Posts the account liked." },
      { key: "commentLikes", label: "Comment likes", description: "Comments the account liked." },
      { key: "postSaves", label: "Saved posts", description: "Posts saved for later." },
      { key: "reviewsWritten", label: "Reviews written", description: "Reviews authored by the account." },
      { key: "reviewsReceived", label: "Reviews received", description: "Reviews received by the account." }
    ]
  },
  {
    key: "relationships",
    title: "Relationships & Communication",
    description: "Social graph, conversations, and outbound/inbound communication surfaces.",
    icon: Users,
    items: [
      { key: "follows", label: "Follows", description: "Users and workers this account followed." },
      { key: "followers", label: "Followers", description: "Recent followers of the account." },
      { key: "savedWorkers", label: "Saved workers", description: "Worker profiles saved by the user." },
      { key: "messages", label: "Messages", description: "Recent sent chat messages." },
      { key: "conversations", label: "Conversations", description: "Recent chat or request-linked conversations." },
      { key: "notifications", label: "Notifications", description: "Recent in-app notifications delivered to the account." }
    ]
  },
  {
    key: "commerce",
    title: "Marketplace Activity",
    description: "Demand-side marketplace operations linked to the account.",
    icon: BriefcaseBusiness,
    items: [
      { key: "serviceRequests", label: "Service requests", description: "Requests opened by the user." },
      { key: "bookings", label: "Bookings", description: "Bookings made as a customer." }
    ]
  },
  {
    key: "risk",
    title: "Trust, Support & Evidence",
    description: "Signals and evidence operators need during investigations.",
    icon: ShieldAlert,
    items: [
      { key: "reports", label: "Reports", description: "Moderation reports filed by the user." },
      { key: "supportTickets", label: "Support tickets", description: "Support tickets opened by the account." },
      { key: "fraudSignals", label: "Fraud signals", description: "Risk signals attached to the account." },
      { key: "mediaAssets", label: "Media assets", description: "Recent uploaded media and documents." }
    ]
  }
] as const;

const workerCollectionGroups = [
  ...userCollectionGroups,
  {
    key: "worker-marketplace",
    title: "Worker Marketplace Record",
    description: "Supply-side marketplace activity and discovery performance.",
    icon: WalletCards,
    items: [
      { key: "assignments", label: "Assignments", description: "Recent service request assignments." },
      { key: "bookingsAsWorker", label: "Bookings as worker", description: "Completed or active worker-side bookings." },
      { key: "savedByUsers", label: "Saved by users", description: "Users who recently saved this worker." },
      { key: "searchImpressions", label: "Search impressions", description: "Recent marketplace search exposure." }
    ]
  }
] as const;

const getVerificationRequestValue = (record: Record<string, unknown> | null | undefined, key: string) => {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const getVerificationRequestTimestamp = (record: Record<string, unknown> | null | undefined, key: string) => {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
};

const supportStatusPresets = [
  {
    status: "ASSIGNED",
    label: "Take ownership",
    description: "Use when an operator has claimed the case and is actively driving it."
  },
  {
    status: "WAITING_INTERNAL",
    label: "Need internal fix",
    description: "Use when billing, marketplace, trust, or platform teams still need to do something."
  },
  {
    status: "WAITING_USER",
    label: "Need user reply",
    description: "Use after asking for missing evidence, confirmation, or customer action."
  },
  {
    status: "RESOLVED",
    label: "Resolved",
    description: "Use only after the concrete remediation is complete and explained to the user."
  },
  {
    status: "CLOSED",
    label: "Close case",
    description: "Use when the resolved outcome is stable and no follow-up remains."
  }
] as const;

const ActivityFeed = ({ items, emptyLabel }: { items: AdminActivityItem[]; emptyLabel: string }) => {
  if (items.length === 0) {
    return <p className="text-sm text-[color:var(--jo-muted)]">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const content = (
          <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4 transition hover:border-[rgba(65,150,70,0.22)]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="blue">{item.kind.replaceAll("_", " ")}</Badge>
              {item.status ? <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge> : null}
            </div>
            <p className="mt-3 text-sm font-semibold text-[color:var(--jo-ink)]">{item.title}</p>
            {item.subtitle ? <p className="mt-1 text-sm leading-6 text-[color:var(--jo-muted)]">{item.subtitle}</p> : null}
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">{formatDateTime(item.createdAt)}</p>
          </div>
        );

        return item.linkPath ? (
          <Link className="block" key={item.id} to={item.linkPath}>
            {content}
          </Link>
        ) : (
          <div key={item.id}>{content}</div>
        );
      })}
    </div>
  );
};

const ActivityDomainBoard = ({ items }: { items: AdminActivityItem[] }) => {
  const domains = groupActivityIntoDomains(items);

  if (domains.length === 0) {
    return <p className="text-sm text-[color:var(--jo-muted)]">No recent domain activity was recorded.</p>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {domains.map((domain) => (
        <div className="rounded-[1.35rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4" key={domain.key}>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(65,150,70,0.12),rgba(246,179,19,0.18))] text-[color:var(--jo-forest)]">
              <domain.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[color:var(--jo-ink)]">{domain.title}</p>
              <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{domain.description}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {domain.items.map((item) => (
              <div className="rounded-2xl bg-white px-4 py-3" key={item.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[color:var(--jo-ink)]">{item.title}</p>
                  {item.status ? <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge> : null}
                </div>
                {item.subtitle ? <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{item.subtitle}</p> : null}
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">{formatDateTime(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const ActivityCollectionBoard = ({
  groups,
  collections
}: {
  groups: ReadonlyArray<{
    key: string;
    title: string;
    description: string;
    icon: typeof MessageSquareText;
    items: ReadonlyArray<{
      key: string;
      label: string;
      description: string;
    }>;
  }>;
  collections: AdminUserDetail["activityCollections"] | WorkerDetail["activityCollections"];
}) => {
  const normalizedCollections = collections as unknown as Record<string, AdminActivityItem[]>;
  const totalRecords = groups.reduce((sum, group) => sum + group.items.reduce((groupSum, item) => groupSum + (normalizedCollections[item.key] ?? []).length, 0), 0);

  if (totalRecords === 0) {
    return <p className="text-sm text-[color:var(--jo-muted)]">No structured activity records are available yet for this entity.</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div className="rounded-[1.5rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-5" key={group.key}>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(65,150,70,0.12),rgba(246,179,19,0.18))] text-[color:var(--jo-forest)]">
              <group.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[color:var(--jo-ink)]">{group.title}</p>
              <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{group.description}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {group.items.map((item) => {
              const records = normalizedCollections[item.key] ?? [];

              return (
                <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-white/90 p-4" key={`${group.key}-${item.key}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--jo-ink)]">{item.label}</p>
                      <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{item.description}</p>
                    </div>
                    <div className="rounded-2xl bg-[rgba(65,150,70,0.1)] px-3 py-2 text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(65,150,70,0.82)]">Recent</p>
                      <p className="mt-1 text-lg font-black text-[color:var(--jo-ink)]">{formatNumber(records.length)}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {records.length === 0 ? (
                      <p className="rounded-[1rem] bg-[rgba(255,251,244,0.88)] px-4 py-3 text-sm text-[color:var(--jo-muted)]">No recent records in this lane.</p>
                    ) : (
                      records.map((record) => {
                        const content = (
                          <div className="rounded-[1rem] bg-[rgba(255,251,244,0.88)] px-4 py-3 transition hover:bg-[rgba(255,248,238,0.98)]">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-[color:var(--jo-ink)]">{record.title}</p>
                              {record.status ? <Badge variant={getStatusBadgeVariant(record.status)}>{record.status}</Badge> : null}
                            </div>
                            {record.subtitle ? <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{record.subtitle}</p> : null}
                            {record.meta?.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {record.meta.map((entry) => (
                                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(107,114,102,0.82)]" key={`${record.id}-${entry.label}`}>
                                    {entry.label}: {entry.value}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">{formatDateTime(record.createdAt)}</p>
                          </div>
                        );

                        return record.linkPath ? (
                          <Link className="block" key={record.id} to={record.linkPath}>
                            {content}
                          </Link>
                        ) : (
                          <div key={record.id}>{content}</div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const MediaAssetStrip = ({ assets, emptyLabel }: { assets: AdminMediaAssetItem[]; emptyLabel: string }) => {
  if (assets.length === 0) {
    return <p className="text-sm text-[color:var(--jo-muted)]">{emptyLabel}</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {assets.map((asset) => (
        <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4" key={asset.id}>
          {asset.finalCdnUrl && isImageMimeType(asset.mimeType) ? (
            <img alt={asset.originalFilename ?? asset.category} className="mb-4 h-36 w-full rounded-[1rem] object-cover" src={asset.finalCdnUrl} />
          ) : (
            <div className="mb-4 flex h-36 w-full flex-col items-center justify-center rounded-[1rem] border border-dashed border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] text-sm font-semibold text-[color:var(--jo-muted)]">
              <FileText className="h-7 w-7 text-[color:var(--jo-coral)]" />
              <span className="mt-3">{isPdfMimeType(asset.mimeType) ? "PDF document" : asset.category}</span>
              <span className="mt-1 text-xs uppercase tracking-[0.16em]">{asset.mimeType ?? "unknown mime"}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusBadgeVariant(asset.status)}>{asset.status}</Badge>
            <Badge variant="slate">{asset.visibility}</Badge>
          </div>
          <p className="mt-3 text-sm font-semibold text-[color:var(--jo-ink)]">{asset.originalFilename ?? asset.storageKey}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">{asset.mimeType}</p>
          <p className="mt-1 font-mono text-[11px] text-[color:var(--jo-muted)]">{compactId(asset.id)}</p>
          {asset.finalCdnUrl ? (
            <a
              className="mt-3 inline-flex items-center justify-center rounded-[1rem] border border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] px-4 py-2.5 text-sm font-semibold text-[color:var(--jo-ink)] transition hover:border-[rgba(65,150,70,0.24)] hover:bg-white"
              href={asset.finalCdnUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open file
            </a>
          ) : null}
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">{formatDateTime(asset.createdAt)}</p>
        </div>
      ))}
    </div>
  );
};

const UserDetailPage = () => {
  const location = useLocation();
  const { userId = "" } = useParams();
  const queryClient = useQueryClient();
  const adminQuery = useCurrentAdmin();
  const roles = adminQuery.data?.roles ?? [];
  const [suspendReason, setSuspendReason] = useState("Manual risk or trust review");
  const [reactivateNotes, setReactivateNotes] = useState("Reactivated after manual review");
  const [pendingSessionRevokeId, setPendingSessionRevokeId] = useState<string | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const userQuery = useQuery({
    queryKey: ["admin", "users", "detail", userId],
    queryFn: () => apiRequest<AdminUserDetail>(`/admin/users/${userId}`),
    enabled: Boolean(userId)
  });

  const user = userQuery.data;
  const isSuspendView = location.pathname.endsWith("/suspend");
  const isReactivateView = location.pathname.endsWith("/reactivate");

  const statusMutation = useMutation({
    mutationFn: ({ action, body }: { action: "suspend" | "reactivate"; body: Record<string, unknown> }) =>
      apiRequest(`/admin/users/${userId}/${action}`, {
        method: "POST",
        body
      }),
    onSuccess: async (_, variables) => {
      toast.success(variables.action === "suspend" ? "User suspended" : "User reactivated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", userId] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to update user status")
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiRequest(`/admin/users/${userId}/sessions/${sessionId}/revoke`, {
        method: "POST"
      }),
    onSuccess: async () => {
      toast.success("User session revoked");
      setPendingSessionRevokeId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", userId] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to revoke this session")
  });

  const revokeAllSessionsMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ revokedCount: number }>(`/admin/users/${userId}/sessions/revoke-all`, {
        method: "POST"
      }),
    onSuccess: async (result) => {
      toast.success(result.revokedCount > 0 ? `Revoked ${result.revokedCount} active session${result.revokedCount === 1 ? "" : "s"}` : "No active sessions to revoke");
      setConfirmRevokeAll(false);
      setPendingSessionRevokeId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users", "detail", userId] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to revoke all sessions for this user")
  });

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected user could not be loaded." title="User Detail">
          <BackButton label="Back to users" to="/users" />
        </PageHeader>
      </div>
    );
  }

  const userActivitySummary = user.activitySummary ?? emptyUserActivitySummary;
  const userActiveSessions = user.activeSessions ?? [];
  const userActivityCollections = user.activityCollections ?? emptyUserActivityCollections;
  const userActivityTimeline = user.activityTimeline ?? [];
  const userRecentMediaAssets = user.recentMediaAssets ?? [];
  const canRevokeSessions = hasPermission(roles, "USER_SESSION_REVOKE");

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={
          isSuspendView
            ? "Focused lifecycle action screen for suspension and trust intervention."
            : isReactivateView
              ? "Focused lifecycle action screen for reactivating a previously restricted account."
              : "Lifecycle, profile, roles, and support footprint for a specific account."
        }
        title={isSuspendView ? "Suspend User" : isReactivateView ? "Reactivate User" : "User Detail"}
      >
        <BackButton label="Back to users" to="/users" />
        <Link className="inline-flex" to="/access-control">
          <Button variant="outline">
            <UserRoundCog className="h-4 w-4" />
            Access control
          </Button>
        </Link>
      </PageHeader>

      <EntityHero
        badges={[{ label: user.status, variant: getStatusBadgeVariant(user.status) }, ...(user.roles ?? []).map((role) => ({ label: role, variant: "blue" as const }))]}
        eyebrow="Account intelligence"
        meta={[
          { label: "Email", value: user.email ?? "No email" },
          { label: "Sessions", value: formatNumber(user.sessionCount) },
          { label: "Open tickets", value: formatNumber(user.openTicketCount) },
          { label: "Created", value: formatDateTime(user.createdAt) }
        ]}
        subtitle="Use this record to understand user lifecycle state, support load, and any admin roles linked to the account."
        title={formatDisplayName(user.profile, user.email ?? "Unknown user")}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard description="Direct account facts and profile metadata." title="Profile Snapshot">
          <div className="space-y-5">
            <KeyValueGrid
              columns="four"
              items={[
                { label: "User ID", value: user.id, mono: true },
                { label: "Phone", value: user.phone ?? "Not provided" },
                { label: "Email verified", value: user.isEmailVerified ? "Verified" : "Pending" },
                { label: "Phone verified", value: user.isPhoneVerified ? "Verified" : "Pending" },
                { label: "Last login", value: formatDateTime(user.lastLoginAt) },
                { label: "City", value: user.profile?.city?.name ?? user.profile?.cityId ?? "No city" },
                {
                  label: "Coordinates",
                  value: user.profile?.lat && user.profile?.lng ? `${user.profile.lat}, ${user.profile.lng}` : "Not recorded"
                },
                { label: "Worker profile", value: user.workerProfile?.verificationStatus ?? "No worker profile" },
                { label: "Updated", value: formatDateTime(user.updatedAt) }
              ]}
            />

            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <div className="rounded-[1.35rem] border border-[rgba(112,104,84,0.12)] bg-[rgba(255,251,244,0.92)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:rgba(107,114,102,0.72)]">Identity portrait</p>
                {user.profile?.avatarUrl ? (
                  <img alt={formatDisplayName(user.profile, user.email ?? "User")} className="mt-4 h-40 w-full rounded-[1.1rem] object-cover" src={user.profile.avatarUrl} />
                ) : (
                  <div className="mt-4 flex h-40 w-full items-center justify-center rounded-[1.1rem] border border-dashed border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] text-sm font-semibold text-[color:var(--jo-muted)]">
                    No avatar on file
                  </div>
                )}
                <p className="mt-4 text-sm font-semibold text-[color:var(--jo-ink)]">{formatDisplayName(user.profile, user.email ?? "Unknown user")}</p>
                <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{user.profile?.bio || "No biography recorded."}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Posts</p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--jo-ink)]">{formatNumber(userActivitySummary.posts)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Messages</p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--jo-ink)]">{formatNumber(userActivitySummary.messages)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Reports</p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--jo-ink)]">{formatNumber(userActivitySummary.reports)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Followers</p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--jo-ink)]">{formatNumber(userActivitySummary.followers)}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard description="High-risk user lifecycle actions are gated by admin permission and backend MFA." title="Lifecycle Controls">
          <div className="space-y-4">
            {user.status === "ACTIVE" ? (
              <PermissionGate permission="USER_SUSPEND">
                <Textarea onChange={(event) => setSuspendReason(event.target.value)} value={suspendReason} />
                <Button disabled={statusMutation.isPending || suspendReason.trim().length < 5} onClick={() => statusMutation.mutate({ action: "suspend", body: { reason: suspendReason } })} variant="danger">
                  Suspend user
                </Button>
              </PermissionGate>
            ) : null}

            {user.status === "SUSPENDED" ? (
              <PermissionGate permission="USER_REACTIVATE">
                <Textarea onChange={(event) => setReactivateNotes(event.target.value)} value={reactivateNotes} />
                <Button
                  disabled={statusMutation.isPending || reactivateNotes.trim().length < 5}
                  onClick={() => statusMutation.mutate({ action: "reactivate", body: { notes: reactivateNotes } })}
                  variant="success"
                >
                  Reactivate user
                </Button>
              </PermissionGate>
            ) : null}

            {user.workerProfile ? (
              <Link className="inline-flex" to={`/workers/${user.workerProfile.id}`}>
                <Button variant="outline">
                  Open worker detail
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}

            <div className="space-y-3 border-t border-[rgba(112,104,84,0.12)] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:rgba(107,114,102,0.72)]">Active sessions</p>
                {canRevokeSessions ? (
                  confirmRevokeAll ? (
                    <div className="flex flex-wrap gap-2">
                      <Button className="px-3 py-2 text-xs" disabled={revokeAllSessionsMutation.isPending} onClick={() => revokeAllSessionsMutation.mutate()} variant="danger">
                        Confirm revoke all
                      </Button>
                      <Button className="px-3 py-2 text-xs" disabled={revokeAllSessionsMutation.isPending} onClick={() => setConfirmRevokeAll(false)} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="px-3 py-2 text-xs"
                      disabled={revokeAllSessionsMutation.isPending || userActiveSessions.length === 0}
                      onClick={() => setConfirmRevokeAll(true)}
                      variant="outline"
                    >
                      Force logout all
                    </Button>
                  )
                ) : null}
              </div>
              {userActiveSessions.length === 0 ? (
                <p className="text-sm text-[color:var(--jo-muted)]">No active sessions recorded.</p>
              ) : (
                userActiveSessions.map((session) => (
                  <div className="rounded-[1.15rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-3" key={session.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={session.mfaVerified ? "green" : "amber"}>{session.mfaVerified ? "MFA verified" : "No MFA"}</Badge>
                      {session.mfaMethod ? <Badge variant="slate">{session.mfaMethod}</Badge> : null}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[color:var(--jo-ink)]">{session.deviceType ?? "Unknown device"}</p>
                    <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{session.ipAddress ?? "No IP recorded"}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">
                      {session.mfaVerified ? `Step-up ${formatDateTime(session.mfaVerifiedAt)}` : "Step-up not verified"}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Expires {formatDateTime(session.expiresAt)}</p>
                    {canRevokeSessions ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pendingSessionRevokeId === session.id ? (
                          <>
                            <Button
                              className="px-3 py-2 text-xs"
                              disabled={revokeSessionMutation.isPending}
                              onClick={() => revokeSessionMutation.mutate(session.id)}
                              variant="danger"
                            >
                              Confirm force logout
                            </Button>
                            <Button
                              className="px-3 py-2 text-xs"
                              disabled={revokeSessionMutation.isPending}
                              onClick={() => setPendingSessionRevokeId(null)}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            className="px-3 py-2 text-xs"
                            disabled={revokeSessionMutation.isPending || revokeAllSessionsMutation.isPending}
                            onClick={() => setPendingSessionRevokeId(session.id)}
                            variant="outline"
                          >
                            Force logout
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard description="Counts across content, trust, engagement, support, and commerce actions attributed to this user." title="Activity Summary">
          <KeyValueGrid
            columns="four"
            items={[
              { label: "Comments", value: formatNumber(userActivitySummary.comments) },
              { label: "Post likes", value: formatNumber(userActivitySummary.postLikes) },
              { label: "Comment likes", value: formatNumber(userActivitySummary.commentLikes) },
              { label: "Post saves", value: formatNumber(userActivitySummary.postSaves) },
              { label: "Follows", value: formatNumber(userActivitySummary.follows) },
              { label: "Saved workers", value: formatNumber(userActivitySummary.savedWorkers) },
              { label: "Conversations", value: formatNumber(userActivitySummary.conversations) },
              { label: "Notifications", value: formatNumber(userActivitySummary.notifications) },
              { label: "Requests", value: formatNumber(userActivitySummary.serviceRequests) },
              { label: "Bookings", value: formatNumber(userActivitySummary.bookings) },
              { label: "Reviews written", value: formatNumber(userActivitySummary.reviewsWritten) },
              { label: "Reviews received", value: formatNumber(userActivitySummary.reviewsReceived) },
              { label: "Support tickets", value: formatNumber(userActivitySummary.supportTickets) },
              { label: "Fraud signals", value: formatNumber(userActivitySummary.fraudSignals) },
              { label: "Media assets", value: formatNumber(userActivitySummary.mediaAssets) }
            ]}
          />
        </SectionCard>

        <SectionCard description="The latest cross-system events tied to this user, with direct links into the relevant admin surfaces." title="Cross-System Activity">
          <ActivityFeed emptyLabel="No recorded activity yet for this account." items={userActivityTimeline} />
        </SectionCard>
      </div>

      <SectionCard description="A faster investigative cut of the same timeline, grouped by operational domain so moderators and support agents can scan patterns quickly." title="Activity Evidence Lanes">
        <ActivityDomainBoard items={userActivityTimeline} />
      </SectionCard>

      <SectionCard
        description="Structured recent records across content, comms, commerce, support, and trust so operators can inspect what this account actually did without leaving the detail desk."
        title="Structured Operational Record"
      >
        <ActivityCollectionBoard collections={userActivityCollections} groups={userCollectionGroups} />
      </SectionCard>

      <SectionCard description="Recent media and document uploads owned by this user account." title="Media & Documents">
        <MediaAssetStrip assets={userRecentMediaAssets} emptyLabel="No media assets have been uploaded by this user." />
      </SectionCard>
    </div>
  );
};

const WorkerDetailPage = () => {
  const { workerId = "" } = useParams();
  const queryClient = useQueryClient();
  const adminQuery = useCurrentAdmin();
  const roles = adminQuery.data?.roles ?? [];
  const [approvalNotes, setApprovalNotes] = useState("Verification approved after full review");
  const [rejectionNotes, setRejectionNotes] = useState("Provide clearer identity and license documents");
  const [featureNotes, setFeatureNotes] = useState("Featured placement updated from admin console");
  const [featureEndsAt, setFeatureEndsAt] = useState("");

  const workerQuery = useQuery({
    queryKey: ["admin", "workers", "detail", workerId],
    queryFn: () => apiRequest<WorkerDetail>(`/admin/workers/${workerId}`),
    enabled: Boolean(workerId)
  });
  const docsQuery = useQuery({
    queryKey: ["admin", "workers", "docs", workerId],
    queryFn: () => apiRequest<WorkerVerificationDocuments>(`/admin/workers/${workerId}/verification-documents`),
    enabled: Boolean(workerId) && hasPermission(roles, "WORKER_VERIFY")
  });
  const subscriptionQuery = useQuery({
    queryKey: ["admin", "workers", "subscription", workerId],
    queryFn: () => apiRequest<WorkerSubscriptionSnapshot>(`/admin/workers/${workerId}/subscription`),
    enabled: Boolean(workerId) && hasPermission(roles, "FEATURED_WORKER_MANAGE")
  });

  const reviewMutation = useMutation({
    mutationFn: ({ action, body }: { action: "verify" | "reject-verification"; body: Record<string, unknown> }) =>
      apiRequest(`/admin/workers/${workerId}/${action}`, {
        method: "POST",
        body
      }),
    onSuccess: async (_, variables) => {
      toast.success(variables.action === "verify" ? "Worker approved" : "Worker rejected");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "workers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workers", "detail", workerId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workers", "docs", workerId] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to review worker")
  });

  const featureMutation = useMutation({
    mutationFn: ({ action, body }: { action: "ENABLE" | "DISABLE" | "EXTEND"; body: Record<string, unknown> }) =>
      apiRequest(`/admin/featured-workers/${workerId}`, {
        method: "PATCH",
        body: {
          action,
          ...body
        }
      }),
    onSuccess: async () => {
      toast.success("Featured placement updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "featured-workers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workers", "detail", workerId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workers", "subscription", workerId] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to update featured placement")
  });

  const worker = workerQuery.data;
  const docs = docsQuery.data;
  const subscription = subscriptionQuery.data;

  if (!worker) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected worker profile could not be loaded." title="Worker Detail">
          <BackButton label="Back to workers" to="/workers" />
        </PageHeader>
      </div>
    );
  }

  const canVerify = hasPermission(roles, "WORKER_VERIFY");
  const canReject = hasPermission(roles, "WORKER_REJECT_VERIFICATION");
  const canManageFeatured = hasPermission(roles, "FEATURED_WORKER_MANAGE");
  const workerActivitySummary = worker.activitySummary ?? emptyWorkerActivitySummary;
  const workerActivityCollections = worker.activityCollections ?? emptyWorkerActivityCollections;
  const workerActivityTimeline = worker.activityTimeline ?? [];
  const workerRecentMediaAssets = worker.recentMediaAssets ?? [];
  const workerPortfolioItems = worker.portfolioItems ?? [];
  const workerAvailabilityRules = worker.availabilityRules ?? [];
  const workerAvailabilityExceptions = worker.availabilityExceptions ?? [];
  const workerServices = worker.services ?? [];
  const workerServiceAreas = worker.serviceAreas ?? [];
  const workerTradeCategories = worker.tradeCategories ?? [];
  const workerCertifications = worker.certifications ?? [];
  const workerVerificationRequests = worker.verificationRequests ?? [];
  const latestVerificationRecord =
    ((docs?.latestVerificationRequest as Record<string, unknown> | null | undefined) ?? (workerVerificationRequests[0] as Record<string, unknown> | undefined)) ?? null;
  const effectiveVerificationStatus = getVerificationRequestValue(latestVerificationRecord, "status") ?? worker.verificationStatus;
  const workerIsApproved = effectiveVerificationStatus === "APPROVED";
  const workerIsRejected = effectiveVerificationStatus === "REJECTED";
  const workerNeedsReview = effectiveVerificationStatus === "SUBMITTED" || effectiveVerificationStatus === "UNDER_REVIEW";
  const featuredNow = subscription?.isFeatured ?? worker.isFeatured;

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Full worker operations view: verification, featured placement, services, and financial footprint." title="Worker Detail">
        <BackButton label="Back to workers" to="/workers" />
        {canVerify ? (
          <Link className="inline-flex" to={`/verification/${worker.id}`}>
            <Button variant="outline">
              <ShieldCheck className="h-4 w-4" />
              Verification review
            </Button>
          </Link>
        ) : null}
        {canManageFeatured ? (
          <Link className="inline-flex" to={`/workers/${worker.id}/subscription`}>
            <Button variant="outline">
              <WalletCards className="h-4 w-4" />
              Subscription detail
            </Button>
          </Link>
        ) : null}
      </PageHeader>

      <EntityHero
        badges={[
          { label: worker.verificationStatus, variant: getStatusBadgeVariant(worker.verificationStatus) },
          ...(worker.isFeatured ? [{ label: "Featured", variant: "purple" as const }] : []),
          ...(worker.sessionCount > 0 ? [{ label: "Online now", variant: "green" as const }] : [{ label: "Offline", variant: "slate" as const }])
        ]}
        eyebrow="Worker operations"
        meta={[
          { label: "Rating", value: `${worker.avgRating} / 5` },
          { label: "Jobs completed", value: formatNumber(worker.jobsCompleted ?? 0) },
          { label: "Response rate", value: `${worker.responseRate ?? "0"}%` },
          { label: "Radius", value: `${worker.serviceRadiusKm ?? 0} km` },
          { label: "Active sessions", value: formatNumber(worker.sessionCount ?? 0) }
        ]}
        subtitle={worker.bio || worker.headline || "No worker biography recorded."}
        title={worker.displayName || formatDisplayName(worker.user.profile, worker.user.email ?? "Worker")}
      />

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <SectionCard description="Worker identity, trade mix, and coverage footprint." title="Profile Intelligence">
          <div className="space-y-5">
            <KeyValueGrid
              columns="four"
              items={[
                { label: "Worker ID", value: worker.id, mono: true },
                { label: "User", value: worker.user.email ?? worker.user.id },
                { label: "Created", value: formatDateTime(worker.createdAt) },
                { label: "Updated", value: formatDateTime(worker.updatedAt) },
                { label: "Experience", value: `${worker.experienceYears ?? 0} years` },
                { label: "Reviews", value: formatNumber(worker.totalReviews) },
                { label: "Featured", value: worker.isFeatured ? "Yes" : "No" },
                { label: "Verification", value: worker.verificationStatus },
                { label: "Last login", value: formatDateTime(worker.user.lastLoginAt) },
                { label: "Email", value: worker.user.email ?? "No email" },
                { label: "Phone", value: worker.user.phone ?? "No phone" },
                { label: "Portfolio", value: formatNumber(workerPortfolioItems.length) },
                { label: "City", value: worker.user.profile?.city?.name ?? worker.user.profile?.cityId ?? "No city" },
                { label: "Presence", value: worker.sessionCount > 0 ? "Online now" : "Offline" }
              ]}
            />

            <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
              <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Identity portrait</p>
                {worker.user.profile?.avatarUrl ? (
                  <img alt={worker.displayName || "Worker"} className="mt-4 h-40 w-full rounded-[1rem] object-cover" src={worker.user.profile.avatarUrl} />
                ) : (
                  <div className="mt-4 flex h-40 w-full items-center justify-center rounded-[1rem] border border-dashed border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] text-sm font-semibold text-[color:var(--jo-muted)]">
                    No avatar on file
                  </div>
                )}
                <p className="mt-4 text-sm font-semibold text-[color:var(--jo-ink)]">{worker.displayName || formatDisplayName(worker.user.profile, worker.user.email ?? "Worker")}</p>
                <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{worker.headline || "No worker headline recorded."}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Trades</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {workerTradeCategories.map((entry) => (
                      <Badge key={entry.id} variant="blue">
                        {entry.tradeCategory?.name ?? entry.tradeCategoryId}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Coverage areas</p>
                  <div className="mt-3 space-y-2">
                    {workerServiceAreas.map((area) => (
                      <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2" key={area.id}>
                        <span className="text-sm font-semibold text-[color:var(--jo-ink)]">{area.city?.name ?? area.cityId}</span>
                        <span className="text-xs font-medium text-[color:var(--jo-muted)]">{area.radiusKm ?? 0} km</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {workerServices.map((service) => (
                <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,253,248,0.96)] p-4" key={service.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[color:var(--jo-ink)]">{service.title}</p>
                    <Badge variant={service.isEnabled ? "green" : "slate"}>{service.isEnabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--jo-muted)]">{service.description || "No service description"}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">
                    {service.basePriceMinor ? formatCurrency(service.basePriceMinor, service.currencyCode ?? "USD") : "Custom pricing"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard description="Verification evidence and review controls." title="Verification Desk">
            <div className="space-y-4">
              <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Latest verification request</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Status</p>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--jo-ink)]">
                      {effectiveVerificationStatus}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Submitted</p>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--jo-ink)]">
                      {formatDateTime(
                        getVerificationRequestTimestamp(
                          (docs?.latestVerificationRequest as Record<string, unknown> | null | undefined) ?? (workerVerificationRequests[0] as Record<string, unknown> | undefined),
                          "createdAt"
                        )
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 md:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Review notes</p>
                    <p className="mt-2 text-sm text-[color:var(--jo-muted)]">
                      {getVerificationRequestValue(
                        latestVerificationRecord,
                        "reviewNotes"
                      ) ??
                        getVerificationRequestValue(
                          latestVerificationRecord,
                          "notes"
                        ) ??
                        "No verification notes recorded yet."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Documents on file</p>
                <div className="mt-3 space-y-2">
                  {(docs?.documents ?? workerCertifications.map((certification) => ({
                    id: certification.id,
                    title: certification.title,
                    issuer: certification.issuer,
                    documentUrl: certification.certificateUrl,
                    verificationStatus: certification.verificationStatus
                  }))).map((document) => (
                    <div className="rounded-2xl bg-white px-4 py-3" key={document.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[color:var(--jo-ink)]">{document.title}</p>
                        <Badge variant={getStatusBadgeVariant(document.verificationStatus)}>{document.verificationStatus}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{document.issuer || "No issuer recorded"}</p>
                      <p className="mt-2 break-all text-xs font-medium text-[color:rgba(107,114,102,0.72)]">{document.documentUrl || "No document URL recorded"}</p>
                      {document.documentUrl ? (
                        <a
                          className="mt-3 inline-flex items-center justify-center rounded-[1rem] border border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] px-4 py-2.5 text-sm font-semibold text-[color:var(--jo-ink)] transition hover:border-[rgba(65,150,70,0.24)] hover:bg-white"
                          href={document.documentUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open document
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={
                  workerIsApproved
                    ? "rounded-[1.25rem] border border-emerald-200 bg-emerald-50/80 p-4"
                    : workerIsRejected
                      ? "rounded-[1.25rem] border border-red-200 bg-red-50/80 p-4"
                      : "rounded-[1.25rem] border border-amber-200 bg-amber-50/80 p-4"
                }
              >
                <p className="text-sm font-semibold text-[color:var(--jo-ink)]">
                  {workerIsApproved
                    ? "Worker already approved"
                    : workerIsRejected
                      ? "Worker verification is currently rejected"
                      : workerNeedsReview
                        ? "Worker is waiting for operator review"
                        : "Worker has not completed a reviewable verification submission yet"}
                </p>
                <p className="mt-2 text-sm text-[color:var(--jo-muted)]">
                  {workerIsApproved
                    ? "The review action is complete. The console now exposes follow-up operational controls instead of a stale approve button."
                    : workerIsRejected
                      ? "Use the rejection notes and document evidence above to decide whether a re-submission or support follow-up is needed."
                      : workerNeedsReview
                        ? "Approve or reject only after checking the document desk, city/service footprint, and recent platform activity."
                        : "This profile can still be inspected in full, but approval actions should wait until a verification request is submitted."}
                </p>
              </div>

              {canVerify && !workerIsApproved ? (
                <div className="space-y-3 rounded-[1.25rem] border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Approve verification</p>
                  <Textarea onChange={(event) => setApprovalNotes(event.target.value)} value={approvalNotes} />
                  <Button disabled={reviewMutation.isPending || approvalNotes.trim().length < 5} onClick={() => reviewMutation.mutate({ action: "verify", body: { notes: approvalNotes } })} variant="success">
                    <BadgeCheck className="h-4 w-4" />
                    {workerNeedsReview ? "Approve worker" : "Approve when submission is ready"}
                  </Button>
                </div>
              ) : null}

              {canReject && !workerIsRejected ? (
                <div className="space-y-3 rounded-[1.25rem] border border-red-100 bg-red-50/70 p-4">
                  <p className="text-sm font-semibold text-red-900">Reject verification</p>
                  <Textarea onChange={(event) => setRejectionNotes(event.target.value)} value={rejectionNotes} />
                  <Button
                    disabled={reviewMutation.isPending || rejectionNotes.trim().length < 5}
                    onClick={() => reviewMutation.mutate({ action: "reject-verification", body: { reviewNotes: rejectionNotes } })}
                    variant="danger"
                  >
                    Reject worker
                  </Button>
                </div>
              ) : null}
            </div>
          </SectionCard>

          {canManageFeatured ? (
            <SectionCard description="Live featured subscription and billing visibility." title="Featured Placement">
              <div className="space-y-4">
                <KeyValueGrid
                  columns="two"
                  items={[
                    { label: "Featured now", value: featuredNow ? "Yes" : "No" },
                    { label: "Invoices", value: formatNumber(subscription?.invoices.length ?? 0) }
                  ]}
                />

                <Textarea onChange={(event) => setFeatureNotes(event.target.value)} value={featureNotes} />
                <Input onChange={(event) => setFeatureEndsAt(event.target.value)} type="datetime-local" value={featureEndsAt} />

                <div className="flex flex-wrap gap-3">
                  <Button disabled={featureMutation.isPending || featuredNow} onClick={() => featureMutation.mutate({ action: "ENABLE", body: { notes: featureNotes } })}>
                    Enable
                  </Button>
                  <Button disabled={featureMutation.isPending || !featuredNow} onClick={() => featureMutation.mutate({ action: "DISABLE", body: { notes: featureNotes } })} variant="danger">
                    Disable
                  </Button>
                  <Button
                    disabled={featureMutation.isPending || !featuredNow || !featureEndsAt}
                    onClick={() =>
                      featureMutation.mutate({
                        action: "EXTEND",
                        body: { notes: featureNotes, endsAt: new Date(featureEndsAt).toISOString() }
                      })
                    }
                    variant="outline"
                  >
                    Extend
                  </Button>
                </div>

                {(subscription?.subscriptions ?? []).map((entry) => (
                  <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4" key={entry.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{entry.id}</p>
                      <Badge variant={getStatusBadgeVariant(entry.status)}>{entry.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatDateTime(entry.startsAt)} to {formatDateTime(entry.endsAt)}
                    </p>
                  </div>
                ))}

                {(subscription?.invoices ?? []).map((invoice) => (
                  <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4" key={invoice.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(invoice.amountMinor, invoice.currencyCode)}</p>
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{invoice.providerRef || "No provider ref"}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard description="Availability coverage, exceptions, and visual proof of completed work." title="Availability & Portfolio">
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Availability rules</p>
                <div className="mt-3 space-y-2">
                  {workerAvailabilityRules.length === 0 ? (
                    <p className="text-sm text-[color:var(--jo-muted)]">No recurring rules configured.</p>
                  ) : (
                    workerAvailabilityRules.map((rule) => (
                      <div className="rounded-2xl bg-white px-3 py-2" key={rule.id}>
                        <p className="text-sm font-semibold text-[color:var(--jo-ink)]">
                          {formatDayLabel(rule.dayOfWeek)} · {rule.startMinute} to {rule.endMinute}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">{rule.timezone}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Availability exceptions</p>
                <div className="mt-3 space-y-2">
                  {workerAvailabilityExceptions.length === 0 ? (
                    <p className="text-sm text-[color:var(--jo-muted)]">No exception windows recorded.</p>
                  ) : (
                    workerAvailabilityExceptions.map((exception) => (
                      <div className="rounded-2xl bg-white px-3 py-2" key={exception.id}>
                        <p className="text-sm font-semibold text-[color:var(--jo-ink)]">{formatDateTime(exception.startsAt)}</p>
                        <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{exception.reason || formatDateTime(exception.endsAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {workerPortfolioItems.length === 0 ? (
                <p className="text-sm text-[color:var(--jo-muted)]">No portfolio items uploaded yet.</p>
              ) : (
                workerPortfolioItems.map((item) => (
                  <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4" key={item.id}>
                    {item.mediaAsset?.finalCdnUrl && isImageMimeType(item.mediaAsset.mimeType) ? (
                      <img alt={item.title ?? "Portfolio item"} className="h-40 w-full rounded-[1rem] object-cover" src={item.mediaAsset.finalCdnUrl} />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center rounded-[1rem] border border-dashed border-[rgba(112,104,84,0.16)] bg-[rgba(255,253,248,0.96)] text-sm font-semibold text-[color:var(--jo-muted)]">
                        Portfolio evidence
                      </div>
                    )}
                    <p className="mt-4 text-sm font-semibold text-[color:var(--jo-ink)]">{item.title ?? "Untitled portfolio item"}</p>
                    <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{item.caption || "No caption recorded."}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard description="Cross-system activity tied to the worker profile and its linked user account." title="Worker Activity">
          <div className="space-y-5">
            <KeyValueGrid
              columns="four"
              items={[
                { label: "Assignments", value: formatNumber(workerActivitySummary.assignments) },
                { label: "Bookings as worker", value: formatNumber(workerActivitySummary.bookingsAsWorker) },
                { label: "Saved by users", value: formatNumber(workerActivitySummary.savedByUsers) },
                { label: "Search impressions", value: formatNumber(workerActivitySummary.searchImpressions) },
                { label: "Services", value: formatNumber(workerActivitySummary.services) },
                { label: "Service areas", value: formatNumber(workerActivitySummary.serviceAreas) },
                { label: "Certifications", value: formatNumber(workerActivitySummary.certifications) },
                { label: "Verification requests", value: formatNumber(workerActivitySummary.verificationRequests) },
                { label: "Portfolio items", value: formatNumber(workerActivitySummary.portfolioItems) },
                { label: "Availability rules", value: formatNumber(workerActivitySummary.availabilityRules) },
                { label: "Featured subscriptions", value: formatNumber(workerActivitySummary.featuredSubscriptions) },
                { label: "Subscription invoices", value: formatNumber(workerActivitySummary.subscriptionInvoices) }
              ]}
            />

            <ActivityFeed emptyLabel="No worker activity has been recorded yet." items={workerActivityTimeline} />
          </div>
        </SectionCard>
      </div>

      <SectionCard description="Domain-grouped evidence for the worker and linked user account, useful for fast trust, support, and marketplace reviews." title="Worker Evidence Lanes">
        <ActivityDomainBoard items={workerActivityTimeline} />
      </SectionCard>

      <SectionCard
        description="Recent structured records across social, support, marketplace, and worker-specific supply-side operations for deeper investigations."
        title="Structured Worker Record"
      >
        <ActivityCollectionBoard collections={workerActivityCollections} groups={workerCollectionGroups} />
      </SectionCard>

      <SectionCard description="Most recent uploads and processed media tied to the worker account." title="Recent Media">
        <MediaAssetStrip assets={workerRecentMediaAssets} emptyLabel="No recent media assets were found for this worker." />
      </SectionCard>

      <SectionCard description="Live linked-user sessions help operators understand whether this worker is currently active in the system." title="Worker Presence">
        {(worker.activeSessions ?? []).length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {(worker.activeSessions ?? []).map((session) => (
              <div className="rounded-[1.15rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-3" key={session.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="green">Online</Badge>
                  <Badge variant={session.mfaVerified ? "green" : "amber"}>{session.mfaVerified ? "MFA verified" : "No MFA"}</Badge>
                  {session.mfaMethod ? <Badge variant="slate">{session.mfaMethod}</Badge> : null}
                </div>
                <p className="mt-3 text-sm font-semibold text-[color:var(--jo-ink)]">{session.deviceType ?? "Unknown device"}</p>
                <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{session.ipAddress ?? "No IP recorded"}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Created {formatDateTime(session.createdAt)}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Expires {formatDateTime(session.expiresAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[color:var(--jo-muted)]">No active sessions are currently recorded for this worker account.</p>
        )}
      </SectionCard>
    </div>
  );
};

const VerificationReviewPage = () => {
  const { workerId = "" } = useParams();
  const queryClient = useQueryClient();
  const [approvalNotes, setApprovalNotes] = useState("Verification approved after document review.");
  const [rejectionNotes, setRejectionNotes] = useState("Please provide clearer identity and license evidence.");

  const workerQuery = useQuery({
    queryKey: ["admin", "workers", "detail", workerId],
    queryFn: () => apiRequest<WorkerDetail>(`/admin/workers/${workerId}`),
    enabled: Boolean(workerId)
  });
  const docsQuery = useQuery({
    queryKey: ["admin", "workers", "docs", workerId],
    queryFn: () => apiRequest<WorkerVerificationDocuments>(`/admin/workers/${workerId}/verification-documents`),
    enabled: Boolean(workerId)
  });

  const reviewMutation = useMutation({
    mutationFn: ({ action, body }: { action: "verify" | "reject-verification"; body: Record<string, unknown> }) =>
      apiRequest(`/admin/workers/${workerId}/${action}`, {
        method: "POST",
        body
      }),
    onSuccess: async (_, variables) => {
      toast.success(variables.action === "verify" ? "Worker approved" : "Worker rejected");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "workers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "verification-queue"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workers", "detail", workerId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workers", "docs", workerId] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to review worker")
  });

  const worker = workerQuery.data;
  const docs = docsQuery.data;
  const effectiveVerificationStatus =
    getVerificationRequestValue((docs?.latestVerificationRequest as Record<string, unknown> | null | undefined) ?? (worker?.verificationRequests[0] as Record<string, unknown> | undefined), "status") ??
    worker?.verificationStatus ??
    "SUBMITTED";
  const verificationAlreadyApproved = effectiveVerificationStatus === "APPROVED";
  const verificationAlreadyRejected = effectiveVerificationStatus === "REJECTED";

  if (!worker) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected verification record could not be loaded." title="Verification Review">
          <BackButton label="Back to verification queue" to="/verification" />
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Dedicated review desk for worker identity, licensing, and verification evidence." title="Verification Review">
        <BackButton label="Back to verification queue" to="/verification" />
        <Link className="inline-flex" to={`/workers/${worker.id}`}>
          <Button variant="outline">
            Open worker detail
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </PageHeader>

      <EntityHero
        badges={[{ label: worker.verificationStatus, variant: getStatusBadgeVariant(worker.verificationStatus) }]}
        eyebrow="Worker verification"
        meta={[
          { label: "Worker", value: worker.id },
          { label: "User", value: worker.user.email ?? worker.user.id },
          { label: "Trades", value: formatNumber(worker.tradeCategories.length) },
          { label: "Documents", value: formatNumber(docs?.documents.length ?? 0) }
        ]}
        subtitle={worker.headline || worker.bio || "No worker summary provided."}
        title={worker.displayName || formatDisplayName(worker.user.profile, worker.user.email ?? "Worker")}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard description="Identity, trade footprint, and document evidence submitted for review." title="Evidence Panel">
          <div className="space-y-5">
            <KeyValueGrid
              columns="four"
              items={[
                { label: "Verification", value: worker.verificationStatus },
                { label: "Created", value: formatDateTime(worker.createdAt) },
                { label: "Reviews", value: formatNumber(worker.totalReviews) },
                { label: "Experience", value: `${worker.experienceYears ?? 0} years` }
              ]}
            />

            <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Trade categories</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {worker.tradeCategories.map((entry) => (
                  <Badge key={entry.id} variant="blue">
                    {entry.tradeCategory?.name ?? entry.tradeCategoryId}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {(docs?.documents ?? []).map((document) => (
                <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4" key={document.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{document.title}</p>
                    <Badge variant={getStatusBadgeVariant(document.verificationStatus)}>{document.verificationStatus}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{document.issuer || "No issuer recorded"}</p>
                  <p className="mt-2 break-all text-xs font-medium text-slate-400">{document.documentUrl || "No document URL recorded"}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard description="Current review state after the latest verification action." title="Review Status">
            <div
              className={
                verificationAlreadyApproved
                  ? "rounded-[1.25rem] border border-emerald-200 bg-emerald-50/80 p-4"
                  : verificationAlreadyRejected
                    ? "rounded-[1.25rem] border border-red-200 bg-red-50/80 p-4"
                    : "rounded-[1.25rem] border border-amber-200 bg-amber-50/80 p-4"
              }
            >
              <p className="text-sm font-semibold text-[color:var(--jo-ink)]">Current status: {effectiveVerificationStatus}</p>
              <p className="mt-2 text-sm text-[color:var(--jo-muted)]">
                {verificationAlreadyApproved
                  ? "This worker is already approved. The desk now stays in a completed state instead of showing stale action labels."
                  : verificationAlreadyRejected
                    ? "This worker is already rejected. Only proceed again if a new submission or review reversal is explicitly required."
                    : "The verification request is still actionable. Review the evidence panel before recording a final outcome."}
              </p>
            </div>
          </SectionCard>

          <SectionCard description="Approval path for legitimate submissions." title="Approve Worker">
            <div className="space-y-4">
              <Textarea onChange={(event) => setApprovalNotes(event.target.value)} value={approvalNotes} />
              <Button
                disabled={verificationAlreadyApproved || reviewMutation.isPending || approvalNotes.trim().length < 5}
                onClick={() => reviewMutation.mutate({ action: "verify", body: { notes: approvalNotes } })}
                variant="success"
              >
                <BadgeCheck className="h-4 w-4" />
                {verificationAlreadyApproved ? "Already approved" : "Approve verification"}
              </Button>
            </div>
          </SectionCard>

          <SectionCard description="Reject incomplete or invalid submissions with clear operator notes." title="Reject Worker">
            <div className="space-y-4">
              <Textarea onChange={(event) => setRejectionNotes(event.target.value)} value={rejectionNotes} />
              <Button
                disabled={verificationAlreadyRejected || reviewMutation.isPending || rejectionNotes.trim().length < 5}
                onClick={() => reviewMutation.mutate({ action: "reject-verification", body: { reviewNotes: rejectionNotes } })}
                variant="danger"
              >
                {verificationAlreadyRejected ? "Already rejected" : "Reject verification"}
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

const WorkerSubscriptionPage = () => {
  const location = useLocation();
  const { workerId = "" } = useParams();
  const queryClient = useQueryClient();
  const [featureNotes, setFeatureNotes] = useState("Featured placement updated from the admin console.");
  const [featureEndsAt, setFeatureEndsAt] = useState("");

  const workerQuery = useQuery({
    queryKey: ["admin", "workers", "detail", workerId],
    queryFn: () => apiRequest<WorkerDetail>(`/admin/workers/${workerId}`),
    enabled: Boolean(workerId)
  });
  const subscriptionQuery = useQuery({
    queryKey: ["admin", "workers", "subscription", workerId],
    queryFn: () => apiRequest<WorkerSubscriptionSnapshot>(`/admin/workers/${workerId}/subscription`),
    enabled: Boolean(workerId)
  });

  const featureMutation = useMutation({
    mutationFn: ({ action, body }: { action: "ENABLE" | "DISABLE" | "EXTEND"; body: Record<string, unknown> }) =>
      apiRequest(`/admin/workers/${workerId}/subscription`, {
        method: "PATCH",
        body: {
          action,
          ...body
        }
      }),
    onSuccess: async () => {
      toast.success("Worker subscription updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "featured-workers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workers", "detail", workerId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "workers", "subscription", workerId] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to update worker subscription")
  });

  const worker = workerQuery.data;
  const subscription = subscriptionQuery.data;
  const totalRevenueMinor = (subscription?.invoices ?? []).reduce((sum, invoice) => sum + invoice.amountMinor, 0);
  const featuredNow = subscription?.isFeatured ?? worker?.isFeatured ?? false;

  if (!worker) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected worker subscription record could not be loaded." title="Worker Subscription">
          <BackButton label="Back to featured workers" to="/featured-workers" />
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={location.pathname.endsWith("/featured") ? "Focused featured-placement control surface for a single worker." : "Featured placement, subscription history, and billing footprint for one worker."}
        title="Worker Subscription Mgmt"
      >
        <BackButton label="Back to featured workers" to="/featured-workers" />
        <Link className="inline-flex" to={`/workers/${worker.id}`}>
          <Button variant="outline">
            Open worker detail
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </PageHeader>

      <EntityHero
        badges={[
          { label: worker.verificationStatus, variant: getStatusBadgeVariant(worker.verificationStatus) },
          { label: subscription?.isFeatured ? "Featured" : "Standard", variant: subscription?.isFeatured ? "purple" : "slate" }
        ]}
        eyebrow="Subscription operations"
        meta={[
          { label: "Worker", value: worker.id },
          { label: "Subscriptions", value: formatNumber(subscription?.subscriptions.length ?? 0) },
          { label: "Invoices", value: formatNumber(subscription?.invoices.length ?? 0) },
          { label: "Revenue", value: formatCurrency(totalRevenueMinor, subscription?.invoices[0]?.currencyCode ?? "USD") }
        ]}
        subtitle={worker.headline || "No worker headline recorded."}
        title={worker.displayName || formatDisplayName(worker.user.profile, worker.user.email ?? "Worker")}
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard description="Live control surface for featured placement and extension windows." title="Placement Controls">
          <div className="space-y-4">
            <KeyValueGrid
              columns="two"
              items={[
                { label: "Featured now", value: featuredNow ? "Yes" : "No" },
                { label: "Current status", value: subscription?.subscriptions[0]?.status ?? "No active subscription" }
              ]}
            />

            <Textarea onChange={(event) => setFeatureNotes(event.target.value)} value={featureNotes} />
            <Input onChange={(event) => setFeatureEndsAt(event.target.value)} type="datetime-local" value={featureEndsAt} />

            <div className="flex flex-wrap gap-3">
              <Button disabled={featureMutation.isPending || featuredNow} onClick={() => featureMutation.mutate({ action: "ENABLE", body: { notes: featureNotes } })}>
                Enable featured
              </Button>
              <Button disabled={featureMutation.isPending || !featuredNow} onClick={() => featureMutation.mutate({ action: "DISABLE", body: { notes: featureNotes } })} variant="danger">
                Disable featured
              </Button>
              <Button
                disabled={featureMutation.isPending || !featuredNow || !featureEndsAt}
                onClick={() =>
                  featureMutation.mutate({
                    action: "EXTEND",
                    body: { notes: featureNotes, endsAt: new Date(featureEndsAt).toISOString() }
                  })
                }
                variant="outline"
              >
                Extend window
              </Button>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard description="Subscription lifecycle entries written by the featured worker billing flow." title="Subscription Timeline">
            <TimelineList
              items={(subscription?.subscriptions ?? []).map((entry) => ({
                id: entry.id,
                title: entry.status,
                subtitle: `${formatDateTime(entry.startsAt)} to ${formatDateTime(entry.endsAt)}`,
                timestamp: formatDateTime(entry.createdAt),
                badge: { label: entry.status, variant: getStatusBadgeVariant(entry.status) }
              }))}
            />
          </SectionCard>

          <SectionCard description="Invoice records tied to featured placement purchases." title="Billing Ledger">
            <div className="space-y-3">
              {(subscription?.invoices ?? []).map((invoice) => (
                <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4" key={invoice.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(invoice.amountMinor, invoice.currencyCode)}</p>
                    <Badge variant={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{invoice.providerRef || "No provider reference recorded"}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{formatDateTime(invoice.createdAt)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

const ServiceRequestDetailPage = () => {
  const location = useLocation();
  const { requestId = "" } = useParams();
  const requestQuery = useQuery({
    queryKey: ["admin", "service-request", "detail", requestId],
    queryFn: () => apiRequest<ServiceRequestDetail>(`/admin/service-requests/${requestId}`),
    enabled: Boolean(requestId)
  });

  const request = requestQuery.data;
  const isAssignmentsView = location.pathname.endsWith("/assignments");
  const isBookingView = location.pathname.endsWith("/booking");

  if (!request) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected service request could not be loaded." title="Service Request Detail">
          <BackButton label="Back to requests" to="/service-requests" />
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={
          isAssignmentsView
            ? "Focused assignment pipeline view for matching, acceptance, and worker response state."
            : isBookingView
              ? "Focused booking conversion view showing the service request to booking handoff."
              : "Customer demand, worker assignment pipeline, and booking conversion on a single request."
        }
        title={isAssignmentsView ? "Service Request Assignments" : isBookingView ? "Service Request Booking" : "Service Request Detail"}
      >
        <BackButton label="Back to requests" to="/service-requests" />
      </PageHeader>

      <EntityHero
        badges={[{ label: request.status, variant: getStatusBadgeVariant(request.status) }]}
        eyebrow="Marketplace request"
        meta={[
          { label: "Trade", value: request.tradeCategory?.name ?? request.tradeCategoryId },
          { label: "Customer", value: formatDisplayName(request.customerUser?.profile, request.customerUser?.email ?? "Unknown customer") },
          { label: "Requested", value: formatDateTime(request.requestedAt) },
          { label: "Assignments", value: formatNumber(request.assignments.length) }
        ]}
        subtitle={request.description}
        title={request.title}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard description="Core request metadata, geodata, and requested items." title="Request Scope">
          <div className="space-y-5">
            <KeyValueGrid
              columns="four"
              items={[
                { label: "Request ID", value: request.id, mono: true },
                { label: "Location", value: request.locationText ?? "No location text" },
                { label: "Scheduled", value: formatDateTime(request.scheduledAt) },
                { label: "Expires", value: formatDateTime(request.expiresAt) }
              ]}
            />

            <div className="grid gap-3">
              {(request.items ?? []).map((item) => (
                <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4" key={item.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <Badge variant="blue">Qty {item.quantity}</Badge>
                  </div>
                  {item.note ? <p className="mt-2 text-sm text-slate-500">{item.note}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard description="Which workers were matched and how the request converted into a booking." title="Assignment Pipeline">
          <div className="space-y-4">
            {request.assignments.map((assignment) => (
              <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4" key={assignment.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDisplayName(assignment.workerProfile.user?.profile, assignment.workerProfile.user?.email ?? "Worker")}
                  </p>
                  <Badge variant={getStatusBadgeVariant(assignment.assignmentStatus)}>{assignment.assignmentStatus}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{assignment.workerProfile.headline || "No worker headline"}</p>
              </div>
            ))}

            {request.booking ? (
              <Link className="inline-flex" to={`/bookings/${request.booking.id}`}>
                <Button variant="outline">
                  Open linked booking
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const BookingDetailPage = () => {
  const location = useLocation();
  const { bookingId = "" } = useParams();
  const bookingQuery = useQuery({
    queryKey: ["admin", "bookings", "detail", bookingId],
    queryFn: () => apiRequest<BookingDetail>(`/admin/bookings/${bookingId}`),
    enabled: Boolean(bookingId)
  });

  const booking = bookingQuery.data;
  const isReviewView = location.pathname.endsWith("/review");
  const isTimelineView = location.pathname.endsWith("/timeline");

  if (!booking) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected booking could not be loaded." title="Booking Detail">
          <BackButton label="Back to bookings" to="/bookings" />
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={
          isReviewView
            ? "Focused review outcome screen for customer feedback and service quality evidence."
            : isTimelineView
              ? "Focused execution timeline with reschedules, cancellations, and final state changes."
              : "Booking execution, linked request items, customer-worker pairing, and review outcome."
        }
        title={isReviewView ? "Booking Review" : isTimelineView ? "Booking Timeline" : "Booking Detail"}
      >
        <BackButton label="Back to bookings" to="/bookings" />
      </PageHeader>

      <EntityHero
        badges={[{ label: booking.status, variant: getStatusBadgeVariant(booking.status) }]}
        eyebrow="Booking operations"
        meta={[
          { label: "Customer", value: formatDisplayName(booking.customerUser?.profile, booking.customerUser?.email ?? "Unknown customer") },
          { label: "Worker", value: formatDisplayName(booking.workerProfile?.user?.profile, booking.workerProfile?.user?.email ?? "Unknown worker") },
          { label: "Starts", value: formatDateTime(booking.scheduledStart) },
          { label: "Ends", value: formatDateTime(booking.scheduledEnd) }
        ]}
        subtitle={booking.serviceRequest?.description ?? booking.serviceRequest?.locationText ?? "No service-request description available."}
        title={booking.serviceRequest?.title ?? "Booking Detail"}
      />

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard description="Marketplace linkage, scheduling, and request payload." title="Booking Scope">
          <div className="space-y-5">
            <KeyValueGrid
              columns="four"
              items={[
                { label: "Booking ID", value: booking.id, mono: true },
                { label: "Request ID", value: booking.serviceRequestId, mono: true },
                { label: "Completed at", value: formatDateTime(booking.completedAt) },
                { label: "Trade", value: booking.serviceRequest?.tradeCategory?.name ?? "Unknown trade" }
              ]}
            />

            {booking.serviceRequest?.items?.length ? (
              <div className="grid gap-3">
                {booking.serviceRequest.items.map((item) => (
                  <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4" key={item.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <Badge variant="blue">Qty {item.quantity}</Badge>
                    </div>
                    {item.note ? <p className="mt-2 text-sm text-slate-500">{item.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}

            <Link className="inline-flex" to={`/service-requests/${booking.serviceRequestId}`}>
              <Button variant="outline">
                Open parent request
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </SectionCard>

        <SectionCard description="Reschedules, cancellations, and final review signal." title="Execution Trail">
          <div className="space-y-4">
            {booking.review ? (
              <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Customer review</p>
                  <Badge variant="green">{booking.review.rating}/5</Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{booking.review.body}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {booking.review.dimensionScores.map((dimension) => (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3" key={dimension.id}>
                      <p className="text-sm font-semibold capitalize text-slate-700">{dimension.dimensionKey}</p>
                      <p className="mt-1 text-lg font-bold text-slate-950">{dimension.score}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <TimelineList
              items={[
                ...(booking.reschedules ?? []).map((item) => ({
                  id: item.id,
                  title: "Reschedule requested",
                  subtitle: formatDisplayName(item.requestedByUser?.profile, item.requestedByUser?.email ?? "Unknown requester"),
                  timestamp: formatDateTime(item.createdAt),
                  badge: { label: item.status ?? "Pending", variant: getStatusBadgeVariant(item.status) }
                })),
                ...(booking.cancellations ?? []).map((item) => ({
                  id: item.id,
                  title: "Booking cancellation",
                  subtitle: item.reason ?? "No reason recorded",
                  timestamp: formatDateTime(item.createdAt),
                  badge: { label: "Cancelled", variant: "red" as const }
                }))
              ]}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const ContentViewerPage = () => {
  const location = useLocation();
  const { entityType = "", entityId = "" } = useParams();
  const adminQuery = useCurrentAdmin();
  const queryClient = useQueryClient();
  const roles = adminQuery.data?.roles ?? [];

  const contentQuery = useQuery({
    queryKey: ["admin", "content", entityType, entityId],
    queryFn: () => apiRequest<AdminContentView>(`/admin/content/${entityType}/${entityId}`),
    enabled: Boolean(entityType && entityId)
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      const path =
        entityType === "post" ? `/admin/posts/${entityId}` : entityType === "comment" ? `/admin/comments/${entityId}` : `/admin/reviews/${entityId}`;

      return apiRequest(path, {
        method: "DELETE"
      });
    },
    onSuccess: async () => {
      toast.success(`${entityType} removed`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "content"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "moderation-cases"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "posts"] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to remove content")
  });

  const contentView = contentQuery.data;
  const moderationHistory = (contentView?.moderationHistory ?? []) as AdminContentHistoryReport[];
  const canDelete =
    (entityType === "post" && hasPermission(roles, "POST_DELETE")) ||
    (entityType === "comment" && hasPermission(roles, "COMMENT_DELETE")) ||
    (entityType === "review" && hasPermission(roles, "REVIEW_DELETE"));
  const isDeleteView = location.pathname.endsWith("/delete");

  if (!contentView) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected content entity could not be loaded." title="Reported Content Viewer">
          <BackButton label="Back to content ops" to="/content" />
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={isDeleteView ? "Focused moderation action view for deleting the current content entity." : "Dedicated viewer for report-linked content entities and their moderation history."}
        title={isDeleteView ? "Content Action" : "Reported Content Viewer"}
      >
        <BackButton label="Back to content ops" to="/content" />
      </PageHeader>

      <EntityHero
        badges={[{ label: contentView.entityType, variant: "blue" }]}
        eyebrow="Content evidence"
        meta={[
          { label: "Entity type", value: contentView.entityType },
          { label: "Entity id", value: contentView.entityId },
          { label: "Reports", value: formatNumber(moderationHistory.length) },
          { label: "Cases", value: formatNumber(moderationHistory.reduce((sum, item) => sum + item.moderationCases.length, 0)) }
        ]}
        subtitle="Use this screen to inspect the raw content payload and the full moderation trail without switching between queues."
        title={`${contentView.entityType} · ${contentView.entityId}`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <ContentSnapshot contentView={contentView} />

          {canDelete ? (
            <SectionCard description="Irreversible moderation action for the current content entity." title="Content Action">
              <Button disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} variant="danger">
                Delete {entityType}
              </Button>
            </SectionCard>
          ) : null}
        </div>

        <SectionCard description="Reports and moderation cases that have touched this content record." title="Moderation History">
          <div className="space-y-4">
            {moderationHistory.map((report) => (
              <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4" key={report.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{report.reason}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {report.entityType} · {report.entityId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusBadgeVariant(report.status)}>{report.status}</Badge>
                    <Badge variant={getStatusBadgeVariant(report.severity)}>{report.severity}</Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link className="inline-flex" to={`/reports/${report.id}`}>
                    <Button variant="outline">Open report</Button>
                  </Link>
                  {report.moderationCases.map((moderationCase) => (
                    <Link className="inline-flex" key={moderationCase.id} to={`/moderation-cases/${moderationCase.id}`}>
                      <Button variant="ghost">Case {moderationCase.status}</Button>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const SupportTicketDetailPage = () => {
  const location = useLocation();
  const { ticketId = "" } = useParams();
  const queryClient = useQueryClient();
  const adminQuery = useCurrentAdmin();
  const roles = adminQuery.data?.roles ?? [];
  const [messageBody, setMessageBody] = useState("Thanks. We are reviewing this ticket now.");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [status, setStatus] = useState("ASSIGNED");
  const [assignedSupportUserId, setAssignedSupportUserId] = useState("");

  const ticketQuery = useQuery({
    queryKey: ["admin", "support-tickets", "detail", ticketId],
    queryFn: () => apiRequest<SupportTicketDetail>(`/admin/support-tickets/${ticketId}`),
    enabled: Boolean(ticketId)
  });

  const ticket = ticketQuery.data;
  const relatedEntityPath = ticket?.relatedEntitySummary?.linkPath ?? resolveAdminEntityLink(ticket?.relatedEntityType ?? undefined, ticket?.relatedEntityId ?? undefined);
  const canRespond = hasPermission(roles, "SUPPORT_TICKET_RESPOND");
  const canAssign = hasPermission(roles, "SUPPORT_TICKET_ASSIGN");
  const canViewUsers = hasPermission(roles, "USER_VIEW");
  const isReplyView = location.pathname.endsWith("/reply");
  const isAssignView = location.pathname.endsWith("/assign");
  const isStatusView = location.pathname.endsWith("/status");

  useEffect(() => {
    if (ticket?.status) {
      setStatus(ticket.status);
    }
  }, [ticket?.status]);

  useEffect(() => {
    if (ticket?.assignedSupportUserId) {
      setAssignedSupportUserId(ticket.assignedSupportUserId);
      return;
    }

    if (ticket?.availableAssignees?.[0]?.userId) {
      setAssignedSupportUserId(ticket.availableAssignees[0].userId);
    }
  }, [ticket?.assignedSupportUserId, ticket?.availableAssignees]);

  const replyMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/support-tickets/${ticketId}/messages`, {
        method: "POST",
        body: {
          body: messageBody,
          isInternalNote
        }
      }),
    onSuccess: async () => {
      toast.success(isInternalNote ? "Internal note added" : "Reply sent");
      setMessageBody("");
      setIsInternalNote(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets", "detail", ticketId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to send ticket reply")
  });

  const assignMutation = useMutation({
    mutationFn: (targetAssignedSupportUserId?: string) =>
      apiRequest(`/admin/support-tickets/${ticketId}/assign`, {
        method: "PATCH",
        body: {
          assignedSupportUserId: targetAssignedSupportUserId ?? assignedSupportUserId
        }
      }),
    onSuccess: async () => {
      toast.success("Ticket assigned");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets", "detail", ticketId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to assign support ticket")
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/support-tickets/${ticketId}/status`, {
        method: "PATCH",
        body: {
          status
        }
      }),
    onSuccess: async () => {
      toast.success("Ticket status updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets", "detail", ticketId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to update support ticket status")
  });

  if (!ticket) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected support ticket could not be loaded." title="Ticket Detail">
          <BackButton label="Back to support tickets" to="/support-tickets" />
        </PageHeader>
      </div>
    );
  }

  const openedByInvestigation = ticket.openedByUserInvestigation;
  const openedByActivitySummary = openedByInvestigation.activitySummary ?? emptyUserActivitySummary;
  const openedByActivityCollections = openedByInvestigation.activityCollections ?? emptyUserActivityCollections;
  const openedByActiveSessions = openedByInvestigation.activeSessions ?? [];
  const openedByRecentMediaAssets = openedByInvestigation.recentMediaAssets ?? [];
  const ticketAuditTrail = ticket.auditTrail ?? [];
  const relatedSupportTickets = ticket.relatedSupportTickets ?? [];
  const relatedEntityHistory = ticket.relatedEntityHistory ?? [];
  const supportAssignees = ticket.availableAssignees ?? [];
  const playbook = ticket.remediationPlaybook;
  const openedByOnlineNow = openedByActiveSessions.length > 0;

  const ticketTimeline = ticket.messages.map((message: SupportTicketMessageItem) => ({
    id: message.id,
    title: message.isInternalNote ? "Internal note" : "Ticket reply",
    subtitle: `${message.authorUser?.displayName ?? message.authorUserId} · ${message.body}`,
    timestamp: formatDateTime(message.createdAt),
    badge: { label: message.isInternalNote ? "Internal" : "External", variant: message.isInternalNote ? ("amber" as const) : ("blue" as const) }
  }));

  const auditTimeline = ticketAuditTrail.map((entry) => ({
    id: entry.id,
    title: entry.action.replaceAll("_", " "),
    subtitle: [
      formatDisplayName(entry.adminUser?.profile, entry.adminUser?.email ?? entry.adminUserId ?? "Unknown admin"),
      entry.entityType ? `${entry.entityType}${entry.entityId ? ` · ${entry.entityId}` : ""}` : null,
      entry.metadataJson ? JSON.stringify(entry.metadataJson).slice(0, 180) : null
    ]
      .filter(Boolean)
      .join(" · "),
    timestamp: formatDateTime(entry.createdAt),
    badge: { label: "Audit", variant: "purple" as const }
  }));

  return (
    <div className="space-y-6" data-testid="support-ticket-detail-page">
      <PageHeader
        subtitle={
          isReplyView
            ? "Focused support response screen for public replies and internal notes."
            : isAssignView
              ? "Focused assignment screen for routing the ticket to a support owner."
              : isStatusView
                ? "Focused ticket lifecycle screen for moving the case through support states."
                : "Full support workflow with reply, assignment, and ticket status controls."
        }
        title={isReplyView ? "Ticket Reply" : isAssignView ? "Ticket Assign" : isStatusView ? "Ticket Status" : "Ticket Detail"}
      >
        <BackButton label="Back to support tickets" to="/support-tickets" />
        {canViewUsers ? (
          <Link className="inline-flex" to={`/users/${ticket.openedByUserId}`}>
            <Button variant="outline">
              <Users className="h-4 w-4" />
              Open user record
            </Button>
          </Link>
        ) : null}
        {relatedEntityPath ? (
          <Link className="inline-flex" to={relatedEntityPath}>
            <Button variant="outline">
              <LifeBuoy className="h-4 w-4" />
              Open related entity
            </Button>
          </Link>
        ) : null}
      </PageHeader>

      <EntityHero
        badges={[
          { label: ticket.status, variant: getStatusBadgeVariant(ticket.status) },
          { label: ticket.priority, variant: getStatusBadgeVariant(ticket.priority) },
          ...(openedByOnlineNow ? [{ label: "User online", variant: "green" as const }] : [{ label: "User offline", variant: "slate" as const }])
        ]}
        eyebrow="Support operations"
        meta={[
          { label: "Opened by", value: formatDisplayName(ticket.openedByUser?.profile, ticket.openedByUser?.email ?? "Unknown user") },
          { label: "Assigned", value: formatDisplayName(ticket.assignedSupportUser?.profile, ticket.assignedSupportUser?.email ?? "Unassigned") },
          { label: "Messages", value: formatNumber(ticket.messages.length) },
          { label: "Updated", value: formatDateTime(ticket.updatedAt) },
          { label: "Open tickets", value: formatNumber(openedByInvestigation.openTicketCount) },
          { label: "Sessions", value: formatNumber(openedByInvestigation.sessionCount) },
          { label: "Recommended state", value: playbook?.recommendedStatus ?? "ASSIGNED" }
        ]}
        subtitle={ticket.body}
        title={ticket.subject}
      />

      <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <SectionCard description="Ticket metadata, routing context, and audit-friendly status facts." title="Ticket Snapshot">
            <div className="space-y-5">
              <KeyValueGrid
                columns="four"
                items={[
                  { label: "Ticket ID", value: ticket.id, mono: true },
                  { label: "Related type", value: ticket.relatedEntityType ?? "No related entity" },
                  { label: "Related id", value: ticket.relatedEntityId ?? "—", mono: true },
                  { label: "Created", value: formatDateTime(ticket.createdAt) },
                  { label: "Opened by user", value: ticket.openedByUserId, mono: true },
                  { label: "Assigned user", value: ticket.assignedSupportUserId ?? "Unassigned", mono: true },
                  { label: "Priority", value: ticket.priority },
                  { label: "Status", value: ticket.status }
                ]}
              />
              {ticketTimeline.length > 0 ? (
                <div data-testid="support-ticket-message-timeline">
                  <TimelineList items={ticketTimeline} />
                </div>
              ) : (
                <p className="text-sm text-[color:var(--jo-muted)]">No messages or notes were recorded for this ticket yet.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard description="The account behind this ticket, its current risk posture, and the volume of marketplace activity operators may need to inspect." title="Opened-By User Investigation">
            <div className="space-y-5">
              <KeyValueGrid
                columns="four"
                items={[
                  { label: "User ID", value: openedByInvestigation.id, mono: true },
                  { label: "Status", value: openedByInvestigation.status },
                  { label: "Last login", value: formatDateTime(openedByInvestigation.lastLoginAt) },
                  { label: "City", value: openedByInvestigation.profile?.city?.name ?? openedByInvestigation.profile?.cityId ?? "No city" },
                  { label: "Open tickets", value: formatNumber(openedByInvestigation.openTicketCount) },
                  { label: "Reports", value: formatNumber(openedByActivitySummary.reports) },
                  { label: "Fraud signals", value: formatNumber(openedByActivitySummary.fraudSignals) },
                  { label: "Conversations", value: formatNumber(openedByActivitySummary.conversations) },
                  { label: "Bookings", value: formatNumber(openedByActivitySummary.bookings) },
                  { label: "Requests", value: formatNumber(openedByActivitySummary.serviceRequests) },
                  { label: "Notifications", value: formatNumber(openedByActivitySummary.notifications) },
                  { label: "Media assets", value: formatNumber(openedByActivitySummary.mediaAssets) }
                ]}
              />
              <ActivityDomainBoard items={openedByInvestigation.activityTimeline ?? []} />
            </div>
          </SectionCard>

          <SectionCard description="Structured activity lanes for everything the account has done across content, communication, marketplace, and trust systems." title="User Record Lanes">
            <ActivityCollectionBoard collections={openedByActivityCollections} groups={userCollectionGroups} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          {canRespond ? (
            <SectionCard description="Reply to the user or add an internal operator note." title="Reply Composer">
              <div className="space-y-4">
                <Textarea data-testid="support-ticket-reply-body" onChange={(event) => setMessageBody(event.target.value)} value={messageBody} />
                <label className="flex items-center gap-3 rounded-[1.25rem] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    checked={isInternalNote}
                    data-testid="support-ticket-internal-note"
                    onChange={(event) => setIsInternalNote(event.target.checked)}
                    type="checkbox"
                  />
                  Save as internal note
                </label>
                <Button data-testid="support-ticket-send-update" disabled={replyMutation.isPending || messageBody.trim().length < 3} onClick={() => replyMutation.mutate()}>
                  Send update
                </Button>
              </div>
            </SectionCard>
          ) : null}

          {canAssign ? (
            <SectionCard description="Support owner and lifecycle controls for the current ticket." title="Ticket Controls">
              <div className="space-y-4">
                <Button
                  disabled={assignMutation.isPending || !adminQuery.data?.user.id}
                  onClick={() => {
                    if (adminQuery.data?.user.id) {
                      setAssignedSupportUserId(adminQuery.data.user.id);
                      assignMutation.mutate(adminQuery.data.user.id);
                    }
                  }}
                  variant="outline"
                >
                  Assign to me
                </Button>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Route ticket to</span>
                  <Select onChange={(event) => setAssignedSupportUserId(event.target.value)} value={assignedSupportUserId}>
                    {supportAssignees.map((assignee) => (
                      <option key={assignee.userId} value={assignee.userId}>
                        {assignee.displayName} · {assignee.roles.join(", ")} · {assignee.openAssignedTicketCount} open
                      </option>
                    ))}
                  </Select>
                </label>
                <Button disabled={assignMutation.isPending || !assignedSupportUserId} onClick={() => assignMutation.mutate(assignedSupportUserId)} variant="outline">
                  Route ticket
                </Button>
                <Select onChange={(event) => setStatus(event.target.value)} value={status}>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="WAITING_USER">Waiting user</option>
                  <option value="WAITING_INTERNAL">Waiting internal</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </Select>
                <Button disabled={statusMutation.isPending} onClick={() => statusMutation.mutate()} variant="success">
                  Update status
                </Button>
                <div className="grid gap-2">
                  {supportStatusPresets.map((preset) => (
                    <button
                      className={`rounded-[1.1rem] border px-4 py-3 text-left transition ${
                        status === preset.status
                          ? "border-[rgba(65,150,70,0.28)] bg-[rgba(65,150,70,0.08)]"
                          : "border-[rgba(112,104,84,0.12)] bg-[rgba(255,251,244,0.92)] hover:border-[rgba(65,150,70,0.22)]"
                      }`}
                      key={preset.status}
                      onClick={() => setStatus(preset.status)}
                      type="button"
                    >
                      <p className="text-sm font-semibold text-[color:var(--jo-ink)]">{preset.label}</p>
                      <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard description="Operator guidance generated from the linked entity and current ticket context." title="Remediation Playbook">
            <div className="space-y-4">
              <div className="rounded-[1.25rem] border border-[rgba(65,150,70,0.16)] bg-[rgba(247,252,246,0.92)] p-4">
                <p className="text-sm font-semibold text-[color:var(--jo-ink)]">{playbook?.headline ?? "Case remediation guidance"}</p>
                <p className="mt-2 text-sm text-[color:var(--jo-muted)]">
                  Recommended lifecycle state: <span className="font-semibold text-[color:var(--jo-ink)]">{playbook?.recommendedStatus ?? "ASSIGNED"}</span>
                </p>
              </div>
              <div className="space-y-2">
                {(playbook?.steps ?? []).map((step, index) => (
                  <div className="rounded-[1.15rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3" key={`${index}-${step}`}>
                    <p className="text-sm font-semibold text-[color:var(--jo-ink)]">Step {index + 1}</p>
                    <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{step}</p>
                  </div>
                ))}
              </div>
              {playbook?.quickLinks?.length ? (
                <div className="flex flex-wrap gap-3">
                  {playbook.quickLinks.map((link) => (
                    <Link className="inline-flex" key={`${link.label}-${link.path}`} to={link.path}>
                      <Button variant="outline">
                        {link.label}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard description="High-signal status markers that help support decide whether the issue is isolated, repeated, or part of a larger trust or marketplace problem." title="Casefile Signals">
            <KeyValueGrid
              columns="four"
              items={[
                { label: "Presence", value: openedByOnlineNow ? "Online now" : "Offline" },
                { label: "Active sessions", value: formatNumber(openedByInvestigation.sessionCount) },
                { label: "Open tickets", value: formatNumber(openedByInvestigation.openTicketCount) },
                { label: "Reports filed", value: formatNumber(openedByActivitySummary.reports) },
                { label: "Fraud signals", value: formatNumber(openedByActivitySummary.fraudSignals) },
                { label: "Bookings", value: formatNumber(openedByActivitySummary.bookings) },
                { label: "Requests", value: formatNumber(openedByActivitySummary.serviceRequests) },
                { label: "Notifications", value: formatNumber(openedByActivitySummary.notifications) }
              ]}
            />
          </SectionCard>

          <SectionCard description="The linked entity that triggered this ticket, with a fast jump into its admin desk." title="Related Entity">
            {ticket.relatedEntitySummary ? (
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="blue">{ticket.relatedEntitySummary.entityType.replaceAll("_", " ")}</Badge>
                    {ticket.relatedEntitySummary.status ? (
                      <Badge variant={getStatusBadgeVariant(ticket.relatedEntitySummary.status)}>{ticket.relatedEntitySummary.status}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[color:var(--jo-ink)]">{ticket.relatedEntitySummary.title}</p>
                  {ticket.relatedEntitySummary.subtitle ? <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{ticket.relatedEntitySummary.subtitle}</p> : null}
                  {ticket.relatedEntitySummary.meta?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ticket.relatedEntitySummary.meta.map((entry) => (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:rgba(107,114,102,0.82)]" key={`${entry.label}-${entry.value}`}>
                          {entry.label}: {entry.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {ticket.relatedEntitySummary.linkPath ? (
                  <Link className="inline-flex" to={ticket.relatedEntitySummary.linkPath}>
                    <Button variant="outline">
                      Open related desk
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <p className="text-sm text-[color:var(--jo-muted)]">This linked entity does not have a dedicated admin desk path yet.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--jo-muted)]">No related entity is attached to this support ticket.</p>
            )}
          </SectionCard>

          <SectionCard description="Lifecycle events from the linked booking, request, worker subscription, or payment record." title="Related Entity History">
            {relatedEntityHistory.length > 0 ? (
              <TimelineList
                items={relatedEntityHistory.map((entry) => ({
                  id: entry.id,
                  title: entry.title,
                  subtitle: entry.subtitle ?? entry.kind.replaceAll("_", " "),
                  timestamp: formatDateTime(entry.createdAt),
                  badge: {
                    label: entry.status ?? entry.kind.replaceAll("_", " "),
                    variant: entry.status ? getStatusBadgeVariant(entry.status) : ("blue" as const)
                  }
                }))}
              />
            ) : (
              <p className="text-sm text-[color:var(--jo-muted)]">No linked-entity history is available for this ticket yet.</p>
            )}
          </SectionCard>

          <SectionCard description="Live sessions for the ticket opener. Use the user desk if you need to revoke sessions or investigate device posture further." title="Active Sessions">
            {openedByActiveSessions.length > 0 ? (
              <div className="space-y-3">
                {openedByActiveSessions.map((session) => (
                  <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4" key={session.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="slate">{session.deviceType}</Badge>
                      <Badge variant={session.mfaVerified ? "green" : "amber"}>{session.mfaVerified ? "MFA verified" : "No MFA step-up"}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[color:var(--jo-ink)]">{session.ipAddress ?? "No IP captured"}</p>
                    <p className="mt-1 text-sm text-[color:var(--jo-muted)]">
                      Created {formatDateTime(session.createdAt)} · Expires {formatDateTime(session.expiresAt)}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">
                      {session.mfaMethod ? `MFA method: ${session.mfaMethod}` : "MFA method not recorded"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--jo-muted)]">No active sessions are currently recorded for this user.</p>
            )}
          </SectionCard>

          <SectionCard description="Other tickets opened by the same account. Useful for spotting repeat patterns or duplicate issues." title="Related Support Tickets">
            {relatedSupportTickets.length > 0 ? (
              <div className="space-y-3">
                {relatedSupportTickets.map((relatedTicket) => (
                  <Link className="block" key={relatedTicket.id} to={`/support-tickets/${relatedTicket.id}`}>
                    <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] p-4 transition hover:border-[rgba(65,150,70,0.22)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(relatedTicket.status)}>{relatedTicket.status}</Badge>
                        <Badge variant={getStatusBadgeVariant(relatedTicket.priority)}>{relatedTicket.priority}</Badge>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-[color:var(--jo-ink)]">{relatedTicket.subject}</p>
                      <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{relatedTicket.body}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">{formatDateTime(relatedTicket.updatedAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--jo-muted)]">This account has no other support tickets on record.</p>
            )}
          </SectionCard>

          <SectionCard description="Documents and media uploaded by the ticket opener across the platform. These often provide the fastest investigation evidence." title="Media & Documents">
            <MediaAssetStrip assets={openedByRecentMediaAssets} emptyLabel="No uploaded media or documents are available for this account." />
          </SectionCard>

          <SectionCard description="Admin-side actions already taken on this ticket or the linked user account." title="Admin Audit Trail">
            {auditTimeline.length > 0 ? (
              <div data-testid="support-ticket-audit-trail">
                <TimelineList items={auditTimeline} />
              </div>
            ) : (
              <p className="text-sm text-[color:var(--jo-muted)]">No admin audit events were recorded for this casefile yet.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

const ReportDetailPage = () => {
  const location = useLocation();
  const { reportId = "" } = useParams();
  const reportQuery = useQuery({
    queryKey: ["admin", "reports", "detail", reportId],
    queryFn: () => apiRequest<AdminReportDetail>(`/admin/reports/${reportId}`),
    enabled: Boolean(reportId)
  });
  const contentQuery = useQuery({
    queryKey: ["admin", "content", "report", reportId],
    queryFn: async () => {
      const report = await apiRequest<AdminReportDetail>(`/admin/reports/${reportId}`);
      return apiRequest<AdminContentView>(`/admin/content/${report.entityType}/${report.entityId}`);
    },
    enabled: Boolean(reportId)
  });

  const report = reportQuery.data;
  const isContentView = location.pathname.endsWith("/content");

  if (!report) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected report could not be loaded." title="Report Detail">
          <BackButton label="Back to reports" to="/reports" />
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={isContentView ? "Focused content-evidence view from a single report record." : "Reporter context, linked content evidence, and moderation-case progression."}
        title={isContentView ? "Reported Content Viewer" : "Report Detail"}
      >
        <BackButton label="Back to reports" to="/reports" />
        <Link className="inline-flex" to={resolveAdminEntityLink(report.entityType, report.entityId) ?? "/content"}>
          <Button variant="outline">
            Open content viewer
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </PageHeader>

      <EntityHero
        badges={[
          { label: report.status, variant: getStatusBadgeVariant(report.status) },
          { label: report.severity, variant: getStatusBadgeVariant(report.severity) }
        ]}
        eyebrow="Trust and safety"
        meta={[
          { label: "Entity", value: `${report.entityType} · ${report.entityId}` },
          { label: "Reporter", value: formatDisplayName(report.reporterUser?.profile, report.reporterUser?.email ?? "Unknown reporter") },
          { label: "Cases", value: formatNumber(report.moderationCases.length) },
          { label: "Opened", value: formatDateTime(report.createdAt) }
        ]}
        subtitle={report.reason}
        title={`Report ${report.id}`}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ContentSnapshot contentView={contentQuery.data} />

        <SectionCard description="Open and historical moderation cases triggered by this report." title="Moderation Trail">
          <div className="space-y-4">
            {report.moderationCases.map((moderationCase) => (
              <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4" key={moderationCase.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{moderationCase.id}</p>
                  <Badge variant={getStatusBadgeVariant(moderationCase.status)}>{moderationCase.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Assignee: {formatDisplayName(moderationCase.assignedAdminUser?.profile, moderationCase.assignedAdminUser?.email ?? "Unassigned")}
                </p>
                <div className="mt-3 space-y-2">
                  {moderationCase.actions.map((action) => (
                    <div className="rounded-2xl bg-slate-50 px-3 py-2" key={action.id}>
                      <p className="text-sm font-semibold text-slate-700">{action.actionType}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.notes || "No action note"}</p>
                    </div>
                  ))}
                </div>
                <Link className="mt-4 inline-flex" to={`/moderation-cases/${moderationCase.id}`}>
                  <Button variant="outline">
                    Open case detail
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const ModerationCaseDetailPage = () => {
  const location = useLocation();
  const { caseId = "" } = useParams();
  const queryClient = useQueryClient();
  const [actionType, setActionType] = useState("REVIEW_NOTE");
  const [notes, setNotes] = useState("Escalated in admin console after manual review.");

  const caseQuery = useQuery({
    queryKey: ["admin", "moderation-cases", "detail", caseId],
    queryFn: () => apiRequest<AdminModerationCaseDetail>(`/admin/moderation-cases/${caseId}`),
    enabled: Boolean(caseId)
  });
  const contentQuery = useQuery({
    queryKey: ["admin", "moderation-cases", "content", caseId],
    queryFn: async () => {
      const moderationCase = await apiRequest<AdminModerationCaseDetail>(`/admin/moderation-cases/${caseId}`);

      if (!moderationCase.report) {
        return undefined;
      }

      return apiRequest<AdminContentView>(`/admin/content/${moderationCase.report.entityType}/${moderationCase.report.entityId}`);
    },
    enabled: Boolean(caseId)
  });

  const actionMutation = useMutation({
    mutationFn: async () => {
      const moderationCase = caseQuery.data;

      if (!moderationCase?.report) {
        throw new Error("Case report not available");
      }

      return apiRequest(`/admin/moderation-cases/${caseId}/actions`, {
        method: "POST",
        body: {
          actionType,
          entityType: moderationCase.report.entityType,
          entityId: moderationCase.report.entityId,
          notes
        }
      });
    },
    onSuccess: async () => {
      toast.success("Moderation action recorded");
      await queryClient.invalidateQueries({ queryKey: ["admin", "moderation-cases", "detail", caseId] });
    },
    onError: (error) => handleActionError(error, "Unable to record moderation action")
  });

  const moderationCase = caseQuery.data;
  const isActionView = location.pathname.endsWith("/actions/new");
  const isContentView = location.pathname.endsWith("/content");

  if (!moderationCase) {
    return (
      <div className="space-y-6">
        <PageHeader subtitle="The selected moderation case could not be loaded." title="Moderation Case Detail">
          <BackButton label="Back to moderation cases" to="/moderation-cases" />
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={
          isActionView
            ? "Focused action composer for recording a new moderation intervention."
            : isContentView
              ? "Focused evidence viewer for the content linked to this moderation case."
              : "Case owner, linked report, evidence, and full action timeline."
        }
        title={isActionView ? "Moderation Action Panel" : isContentView ? "Case Content Viewer" : "Moderation Case Detail"}
      >
        <BackButton label="Back to moderation cases" to="/moderation-cases" />
        {moderationCase.report ? (
          <Link className="inline-flex" to={resolveAdminEntityLink(moderationCase.report.entityType, moderationCase.report.entityId) ?? "/content"}>
            <Button variant="outline">
              Open content viewer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : null}
      </PageHeader>

      <EntityHero
        badges={[{ label: moderationCase.status, variant: getStatusBadgeVariant(moderationCase.status) }]}
        eyebrow="Moderation execution"
        meta={[
          { label: "Case ID", value: moderationCase.id },
          { label: "Assignee", value: formatDisplayName(moderationCase.assignedAdminUser?.profile, moderationCase.assignedAdminUser?.email ?? "Unassigned") },
          { label: "Report", value: moderationCase.report?.id ?? "No linked report" },
          { label: "Updated", value: formatDateTime(moderationCase.updatedAt) }
        ]}
        subtitle={moderationCase.report ? `${moderationCase.report.reason} · ${moderationCase.report.entityType}` : "No linked report payload"}
        title={`Case ${moderationCase.id}`}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <ContentSnapshot contentView={contentQuery.data} />

          <SectionCard description="Action timeline as written to the moderation ledger." title="Action History">
            <TimelineList
              items={moderationCase.actions.map((action) => ({
                id: action.id,
                title: action.actionType,
                subtitle: `${formatDisplayName(action.performedByAdminUser?.profile, action.performedByAdminUser?.email ?? "Unknown admin")} · ${action.notes || "No notes"}`,
                timestamp: formatDateTime(action.createdAt),
                badge: { label: action.entityType, variant: "blue" }
              }))}
            />
          </SectionCard>
        </div>

        <SectionCard description="Record a new action against this case without leaving the detail screen." title="Action Composer">
          <div className="space-y-4">
            <Select onChange={(event) => setActionType(event.target.value)} value={actionType}>
              <option value="REVIEW_NOTE">Review note</option>
              <option value="ESCALATE">Escalate</option>
              <option value="CONTENT_REMOVED">Content removed</option>
              <option value="WARNING_SENT">Warning sent</option>
            </Select>
            <Textarea onChange={(event) => setNotes(event.target.value)} value={notes} />
            <Button disabled={actionMutation.isPending || notes.trim().length < 5} onClick={() => actionMutation.mutate()}>
              Add moderation action
            </Button>
            {moderationCase.report ? (
              <Link className="inline-flex" to={`/reports/${moderationCase.report.id}`}>
                <Button variant="outline">
                  Open linked report
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export {
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
};
