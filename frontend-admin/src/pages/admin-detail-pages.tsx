import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, UserRoundCog } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  BookingDetail,
  ServiceRequestDetail,
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

const UserDetailPage = () => {
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
      <PageHeader subtitle="Lifecycle, profile, roles, and support footprint for a specific account." title="User Detail">
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

const ServiceRequestDetailPage = () => {
  const { requestId = "" } = useParams();
  const requestQuery = useQuery({
    queryKey: ["admin", "service-request", "detail", requestId],
    queryFn: () => apiRequest<ServiceRequestDetail>(`/admin/service-requests/${requestId}`),
    enabled: Boolean(requestId)
  });

  const request = requestQuery.data;

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
      <PageHeader subtitle="Customer demand, worker assignment pipeline, and booking conversion on a single request." title="Service Request Detail">
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
  const { bookingId = "" } = useParams();
  const bookingQuery = useQuery({
    queryKey: ["admin", "bookings", "detail", bookingId],
    queryFn: () => apiRequest<BookingDetail>(`/admin/bookings/${bookingId}`),
    enabled: Boolean(bookingId)
  });

  const booking = bookingQuery.data;

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
      <PageHeader subtitle="Booking execution, linked request items, customer-worker pairing, and review outcome." title="Booking Detail">
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

const ReportDetailPage = () => {
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
      <PageHeader subtitle="Reporter context, linked content evidence, and moderation-case progression." title="Report Detail">
        <BackButton label="Back to reports" to="/reports" />
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
      <PageHeader subtitle="Case owner, linked report, evidence, and full action timeline." title="Moderation Case Detail">
        <BackButton label="Back to moderation cases" to="/moderation-cases" />
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

export { BookingDetailPage, ModerationCaseDetailPage, ReportDetailPage, ServiceRequestDetailPage, UserDetailPage, WorkerDetailPage };
