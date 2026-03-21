import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, LifeBuoy, ShieldCheck, UserRoundCog, WalletCards } from "lucide-react";
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
import { formatCurrency, formatDateTime, formatDisplayName, formatNumber } from "@/lib/utils";
import { ContentSnapshot } from "@/pages/admin-detail-pages.shared";
import type {
  AdminContentView,
  AdminModerationCaseDetail,
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

const UserDetailPage = () => {
  const location = useLocation();
  const { userId = "" } = useParams();
  const queryClient = useQueryClient();
  const [suspendReason, setSuspendReason] = useState("Manual risk or trust review");
  const [reactivateNotes, setReactivateNotes] = useState("Reactivated after manual review");

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
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => handleActionError(error, "Unable to update user status")
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
          <KeyValueGrid
            columns="four"
            items={[
              { label: "User ID", value: user.id, mono: true },
              { label: "Phone", value: user.phone ?? "Not provided" },
              { label: "Email verified", value: user.isEmailVerified ? "Verified" : "Pending" },
              { label: "Phone verified", value: user.isPhoneVerified ? "Verified" : "Pending" },
              { label: "Last login", value: formatDateTime(user.lastLoginAt) },
              { label: "City", value: user.profile?.cityId ?? "No city", mono: true },
              { label: "Worker profile", value: user.workerProfile?.verificationStatus ?? "No worker profile" },
              { label: "Updated", value: formatDateTime(user.updatedAt) }
            ]}
          />
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
          </div>
        </SectionCard>
      </div>
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
    enabled: Boolean(workerId)
  });
  const subscriptionQuery = useQuery({
    queryKey: ["admin", "workers", "subscription", workerId],
    queryFn: () => apiRequest<WorkerSubscriptionSnapshot>(`/admin/workers/${workerId}/subscription`),
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
          ...(worker.isFeatured ? [{ label: "Featured", variant: "purple" as const }] : [])
        ]}
        eyebrow="Worker operations"
        meta={[
          { label: "Rating", value: `${worker.avgRating} / 5` },
          { label: "Jobs completed", value: formatNumber(worker.jobsCompleted ?? 0) },
          { label: "Response rate", value: `${worker.responseRate ?? "0"}%` },
          { label: "Radius", value: `${worker.serviceRadiusKm ?? 0} km` }
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
                { label: "Verification", value: worker.verificationStatus }
              ]}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Trades</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {worker.tradeCategories.map((entry) => (
                    <Badge key={entry.id} variant="blue">
                      {entry.tradeCategory?.name ?? entry.tradeCategoryId}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coverage areas</p>
                <div className="mt-3 space-y-2">
                  {worker.serviceAreas.map((area) => (
                    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2" key={area.id}>
                      <span className="text-sm font-semibold text-slate-700">{area.city?.name ?? area.cityId}</span>
                      <span className="text-xs font-medium text-slate-500">{area.radiusKm ?? 0} km</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {worker.services.map((service) => (
                <div className="rounded-[1.25rem] border border-slate-100 bg-white p-4" key={service.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">{service.title}</p>
                    <Badge variant={service.isEnabled ? "green" : "slate"}>{service.isEnabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{service.description || "No service description"}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
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
              <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Documents on file</p>
                <div className="mt-3 space-y-2">
                  {(docs?.documents ?? []).map((document) => (
                    <div className="rounded-2xl bg-white px-4 py-3" key={document.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{document.title}</p>
                        <Badge variant={getStatusBadgeVariant(document.verificationStatus)}>{document.verificationStatus}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{document.issuer || "No issuer recorded"}</p>
                      <p className="mt-2 break-all text-xs font-medium text-slate-400">{document.documentUrl || "No document URL recorded"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {canVerify ? (
                <div className="space-y-3 rounded-[1.25rem] border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Approve verification</p>
                  <Textarea onChange={(event) => setApprovalNotes(event.target.value)} value={approvalNotes} />
                  <Button disabled={reviewMutation.isPending || approvalNotes.trim().length < 5} onClick={() => reviewMutation.mutate({ action: "verify", body: { notes: approvalNotes } })} variant="success">
                    <BadgeCheck className="h-4 w-4" />
                    Approve worker
                  </Button>
                </div>
              ) : null}

              {canReject ? (
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
                    { label: "Featured now", value: subscription?.isFeatured ? "Yes" : "No" },
                    { label: "Invoices", value: formatNumber(subscription?.invoices.length ?? 0) }
                  ]}
                />

                <Textarea onChange={(event) => setFeatureNotes(event.target.value)} value={featureNotes} />
                <Input onChange={(event) => setFeatureEndsAt(event.target.value)} type="datetime-local" value={featureEndsAt} />

                <div className="flex flex-wrap gap-3">
                  <Button disabled={featureMutation.isPending} onClick={() => featureMutation.mutate({ action: "ENABLE", body: { notes: featureNotes } })}>
                    Enable
                  </Button>
                  <Button disabled={featureMutation.isPending} onClick={() => featureMutation.mutate({ action: "DISABLE", body: { notes: featureNotes } })} variant="danger">
                    Disable
                  </Button>
                  <Button
                    disabled={featureMutation.isPending || !featureEndsAt}
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
          <SectionCard description="Approval path for legitimate submissions." title="Approve Worker">
            <div className="space-y-4">
              <Textarea onChange={(event) => setApprovalNotes(event.target.value)} value={approvalNotes} />
              <Button disabled={reviewMutation.isPending || approvalNotes.trim().length < 5} onClick={() => reviewMutation.mutate({ action: "verify", body: { notes: approvalNotes } })} variant="success">
                <BadgeCheck className="h-4 w-4" />
                Approve verification
              </Button>
            </div>
          </SectionCard>

          <SectionCard description="Reject incomplete or invalid submissions with clear operator notes." title="Reject Worker">
            <div className="space-y-4">
              <Textarea onChange={(event) => setRejectionNotes(event.target.value)} value={rejectionNotes} />
              <Button
                disabled={reviewMutation.isPending || rejectionNotes.trim().length < 5}
                onClick={() => reviewMutation.mutate({ action: "reject-verification", body: { reviewNotes: rejectionNotes } })}
                variant="danger"
              >
                Reject verification
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
                { label: "Featured now", value: subscription?.isFeatured ? "Yes" : "No" },
                { label: "Current status", value: subscription?.subscriptions[0]?.status ?? "No active subscription" }
              ]}
            />

            <Textarea onChange={(event) => setFeatureNotes(event.target.value)} value={featureNotes} />
            <Input onChange={(event) => setFeatureEndsAt(event.target.value)} type="datetime-local" value={featureEndsAt} />

            <div className="flex flex-wrap gap-3">
              <Button disabled={featureMutation.isPending} onClick={() => featureMutation.mutate({ action: "ENABLE", body: { notes: featureNotes } })}>
                Enable featured
              </Button>
              <Button disabled={featureMutation.isPending} onClick={() => featureMutation.mutate({ action: "DISABLE", body: { notes: featureNotes } })} variant="danger">
                Disable featured
              </Button>
              <Button
                disabled={featureMutation.isPending || !featureEndsAt}
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

  const ticketQuery = useQuery({
    queryKey: ["support", "ticket", ticketId],
    queryFn: () => apiRequest<SupportTicketDetail>(`/support/tickets/${ticketId}`),
    enabled: Boolean(ticketId)
  });

  const ticket = ticketQuery.data;
  const relatedEntityPath = resolveAdminEntityLink(ticket?.relatedEntityType ?? undefined, ticket?.relatedEntityId ?? undefined);
  const canRespond = hasPermission(roles, "SUPPORT_TICKET_RESPOND");
  const canAssign = hasPermission(roles, "SUPPORT_TICKET_ASSIGN");
  const isReplyView = location.pathname.endsWith("/reply");
  const isAssignView = location.pathname.endsWith("/assign");
  const isStatusView = location.pathname.endsWith("/status");

  useEffect(() => {
    if (ticket?.status) {
      setStatus(ticket.status);
    }
  }, [ticket?.status]);

  const replyMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/support/tickets/${ticketId}/messages`, {
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
        queryClient.invalidateQueries({ queryKey: ["support", "ticket", ticketId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to send ticket reply")
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/admin/support-tickets/${ticketId}/assign`, {
        method: "PATCH",
        body: {
          assignedSupportUserId: adminQuery.data?.user.id
        }
      }),
    onSuccess: async () => {
      toast.success("Ticket assigned");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["support", "ticket", ticketId] }),
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
        queryClient.invalidateQueries({ queryKey: ["support", "ticket", ticketId] }),
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

  const ticketTimeline = ticket.messages.map((message: SupportTicketMessageItem) => ({
    id: message.id,
    title: message.isInternalNote ? "Internal note" : "Ticket reply",
    subtitle: `${message.authorUser?.displayName ?? message.authorUserId} · ${message.body}`,
    timestamp: formatDateTime(message.createdAt),
    badge: { label: message.isInternalNote ? "Internal" : "External", variant: message.isInternalNote ? ("amber" as const) : ("blue" as const) }
  }));

  return (
    <div className="space-y-6">
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
          { label: ticket.priority, variant: getStatusBadgeVariant(ticket.priority) }
        ]}
        eyebrow="Support operations"
        meta={[
          { label: "Opened by", value: formatDisplayName(ticket.openedByUser?.profile, ticket.openedByUser?.email ?? "Unknown user") },
          { label: "Assigned", value: formatDisplayName(ticket.assignedSupportUser?.profile, ticket.assignedSupportUser?.email ?? "Unassigned") },
          { label: "Messages", value: formatNumber(ticket.messages.length) },
          { label: "Updated", value: formatDateTime(ticket.updatedAt) }
        ]}
        subtitle={ticket.body}
        title={ticket.subject}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <SectionCard description="Ticket metadata, routing context, and audit-friendly status facts." title="Ticket Snapshot">
            <div className="space-y-5">
              <KeyValueGrid
                columns="four"
                items={[
                  { label: "Ticket ID", value: ticket.id, mono: true },
                  { label: "Related type", value: ticket.relatedEntityType ?? "No related entity" },
                  { label: "Related id", value: ticket.relatedEntityId ?? "—", mono: true },
                  { label: "Created", value: formatDateTime(ticket.createdAt) }
                ]}
              />
              <TimelineList items={ticketTimeline} />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          {canRespond ? (
            <SectionCard description="Reply to the user or add an internal operator note." title="Reply Composer">
              <div className="space-y-4">
                <Textarea onChange={(event) => setMessageBody(event.target.value)} value={messageBody} />
                <label className="flex items-center gap-3 rounded-[1.25rem] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700">
                  <input checked={isInternalNote} onChange={(event) => setIsInternalNote(event.target.checked)} type="checkbox" />
                  Save as internal note
                </label>
                <Button disabled={replyMutation.isPending || messageBody.trim().length < 3} onClick={() => replyMutation.mutate()}>
                  Send update
                </Button>
              </div>
            </SectionCard>
          ) : null}

          {canAssign ? (
            <SectionCard description="Support owner and lifecycle controls for the current ticket." title="Ticket Controls">
              <div className="space-y-4">
                <Button disabled={assignMutation.isPending || !adminQuery.data?.user.id} onClick={() => assignMutation.mutate()} variant="outline">
                  Assign to me
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
              </div>
            </SectionCard>
          ) : null}
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
