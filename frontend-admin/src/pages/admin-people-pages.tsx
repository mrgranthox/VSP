import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, ShieldAlert, Star, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { EmptyState, FilterCard, PaginationControls } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiPaginatedRequest, apiRequest, getApiErrorMessage, isMfaRequiredError } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { AdminUserListItem, AdminWorkerListItem, FeaturedWorkerItem } from "@/types/admin";

const handleActionError = (error: unknown, fallback: string) => {
  if (isMfaRequiredError(error)) {
    toast.error("Verify MFA in My Profile before running this action");
    return;
  }

  toast.error(getApiErrorMessage(error, fallback));
};

const ActionDesk = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
  <Card className="h-fit xl:sticky xl:top-28">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

const defaultFeaturedExtensionEndsAt = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

const toDateTimeLocalValue = (isoValue: string) => {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const UsersPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [suspendReason, setSuspendReason] = useState("Manual admin review");
  const [reactivateNotes, setReactivateNotes] = useState("Manual reactivation");

  const searchParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "12"
    });

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (status) {
      params.set("status", status);
    }

    return params.toString();
  }, [page, query, status]);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", page, query, status],
    queryFn: () => apiPaginatedRequest<AdminUserListItem>(`/admin/users?${searchParams}`)
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ userId, action, body }: { userId: string; action: "suspend" | "reactivate"; body: Record<string, unknown> }) =>
      apiRequest(`/admin/users/${userId}/${action}`, {
        method: "POST",
        body
      }),
    onSuccess: async (_, variables) => {
      toast.success(variables.action === "suspend" ? "User suspended" : "User reactivated");
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => handleActionError(error, "Unable to update user")
  });

  const users = usersQuery.data?.data ?? [];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0];

  useEffect(() => {
    if (users.length === 0) {
      if (selectedUserId) {
        setSelectedUserId("");
      }
      return;
    }

    if (!users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Search, review, and control user accounts with the real admin users endpoints." title="Users List" />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Search users</span>
          <Input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Email, phone, or profile name"
            value={query}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Status</span>
          <Select
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DELETED">Deleted</option>
          </Select>
        </label>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Visible users</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(usersQuery.data?.pagination.total ?? 0)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {users.length === 0 ? (
        <EmptyState description="No users matched the current filters." title="No users found" />
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-1">
          {users.map((user) => {
            const displayName =
              user.profile?.displayName || [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim() || user.email || "Unknown user";

            return (
              <Card
                className={user.id === selectedUser?.id ? "border-[rgba(65,150,70,0.26)] shadow-[0_22px_45px_rgba(65,150,70,0.14)]" : undefined}
                key={user.id}
              >
                <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>{displayName}</CardTitle>
                    <CardDescription>{user.email || "No email available"}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusBadgeVariant(user.status)}>{user.status}</Badge>
                    {user.workerProfile ? <Badge variant={getStatusBadgeVariant(user.workerProfile.verificationStatus)}>{user.workerProfile.verificationStatus}</Badge> : null}
                    {user.workerProfile?.isFeatured ? <Badge variant="purple">FEATURED</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 rounded-[1.25rem] bg-slate-50 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">User ID</p>
                      <p className="mt-1 font-mono text-xs text-slate-600">{user.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Last login</p>
                      <p className="mt-1 text-sm text-slate-700">{formatDateTime(user.lastLoginAt)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(user.roles ?? []).length > 0 ? (
                      user.roles.map((role) => (
                        <Badge key={role} variant="blue">
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <Badge>No admin role</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => setSelectedUserId(user.id)}
                      variant={user.id === selectedUser?.id ? "primary" : "outline"}
                    >
                      {user.id === selectedUser?.id ? "Managing now" : "Manage account"}
                    </Button>
                    <Link className="inline-flex" to={`/users/${user.id}`}>
                      <Button variant="outline">
                        Open detail
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>

                    {user.workerProfile ? (
                      <Link className="inline-flex" to={`/workers/${user.workerProfile.id}`}>
                        <Button variant="outline">
                          Worker profile
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>

          <ActionDesk description="All writes here go directly to the live admin user status endpoints." title="User action desk">
            {selectedUser ? (
              <>
                <div className="rounded-[1.25rem] bg-[rgba(255,251,244,0.92)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[color:var(--jo-ink)]">
                        {selectedUser.profile?.displayName ||
                          [selectedUser.profile?.firstName, selectedUser.profile?.lastName].filter(Boolean).join(" ").trim() ||
                          selectedUser.email ||
                          "Unknown user"}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{selectedUser.email || "No email recorded"}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(selectedUser.status)}>{selectedUser.status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Last login</p>
                      <p className="mt-1 text-sm text-[color:var(--jo-ink)]">{formatDateTime(selectedUser.lastLoginAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Role access</p>
                      <p className="mt-1 text-sm text-[color:var(--jo-ink)]">
                        {selectedUser.roles.length > 0 ? selectedUser.roles.join(" · ") : "No admin role"}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedUser.status === "ACTIVE" ? (
                  <>
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Suspension reason</span>
                      <Textarea
                        className="min-h-[132px]"
                        onChange={(event) => setSuspendReason(event.target.value)}
                        value={suspendReason}
                      />
                    </label>
                    <Button
                      disabled={changeStatusMutation.isPending || suspendReason.trim().length < 5}
                      onClick={() =>
                        changeStatusMutation.mutate({
                          userId: selectedUser.id,
                          action: "suspend",
                          body: { reason: suspendReason.trim() }
                        })
                      }
                      variant="danger"
                    >
                      Suspend selected user
                    </Button>
                  </>
                ) : null}

                {selectedUser.status === "SUSPENDED" ? (
                  <>
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Reactivation notes</span>
                      <Textarea
                        className="min-h-[132px]"
                        onChange={(event) => setReactivateNotes(event.target.value)}
                        value={reactivateNotes}
                      />
                    </label>
                    <Button
                      disabled={changeStatusMutation.isPending}
                      onClick={() =>
                        changeStatusMutation.mutate({
                          userId: selectedUser.id,
                          action: "reactivate",
                          body: reactivateNotes.trim() ? { notes: reactivateNotes.trim() } : {}
                        })
                      }
                      variant="success"
                    >
                      Reactivate selected user
                    </Button>
                  </>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Link className="inline-flex" to={`/users/${selectedUser.id}`}>
                    <Button variant="outline">Open full user detail</Button>
                  </Link>
                  {selectedUser.workerProfile ? (
                    <Link className="inline-flex" to={`/workers/${selectedUser.workerProfile.id}`}>
                      <Button variant="outline">Open worker profile</Button>
                    </Link>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-[color:var(--jo-muted)]">Select a user from the list to open the action desk.</p>
            )}
          </ActionDesk>
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={usersQuery.data?.pagination} />
    </div>
  );
};

const WorkersPage = () => {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");

  const searchParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "12"
    });

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (verificationStatus) {
      params.set("verificationStatus", verificationStatus);
    }

    return params.toString();
  }, [page, query, verificationStatus]);

  const workersQuery = useQuery({
    queryKey: ["admin", "workers", page, query, verificationStatus],
    queryFn: () => apiPaginatedRequest<AdminWorkerListItem>(`/admin/workers?${searchParams}`)
  });

  const workers = workersQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Operational directory of worker accounts, verification state, ratings, and featured status." title="Workers List" />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Search workers</span>
          <Input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Name or headline"
            value={query}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Verification</span>
          <Select
            onChange={(event) => {
              setVerificationStatus(event.target.value);
              setPage(1);
            }}
            value={verificationStatus}
          >
            <option value="">All workers</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        </label>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Workers in view</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(workersQuery.data?.pagination.total ?? 0)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {workers.length === 0 ? (
        <EmptyState description="No workers matched the current filter state." title="No workers found" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {workers.map((worker) => (
            <Card key={worker.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{worker.displayName || "Unnamed worker"}</CardTitle>
                  <CardDescription>{worker.headline || "No worker headline yet"}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getStatusBadgeVariant(worker.verificationStatus)}>{worker.verificationStatus}</Badge>
                  {worker.isFeatured ? <Badge variant="purple">FEATURED</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 rounded-[1.25rem] bg-slate-50 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Trades</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{worker.trades.join(", ") || "No trades mapped"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Rating</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {worker.avgRating} · {formatNumber(worker.totalReviews)} reviews
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Subscription</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{worker.latestSubscription?.status ?? "No subscription"}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link className="inline-flex" to={`/workers/${worker.id}`}>
                    <Button variant="outline">
                      Open detail
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link className="inline-flex" to="/verification">
                    <Button variant="outline">
                      Verification queue
                      <ShieldAlert className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link className="inline-flex" to={`/workers/${worker.id}/subscription`}>
                    <Button variant="outline">Subscription</Button>
                  </Link>
                  <Link className="inline-flex" to="/featured-workers">
                    <Button variant="outline">
                      Featured controls
                      <Star className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={workersQuery.data?.pagination} />
    </div>
  );
};

const VerificationQueuePage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("Verification approved by admin");
  const [reviewNotes, setReviewNotes] = useState("Please upload clearer verification documents.");

  const workersQuery = useQuery({
    queryKey: ["admin", "verification-queue", page],
    queryFn: () => apiPaginatedRequest<AdminWorkerListItem>(`/admin/workers?page=${page}&limit=10&verificationStatus=SUBMITTED`)
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      workerId,
      action,
      body
    }: {
      workerId: string;
      action: "verify" | "reject-verification";
      body: Record<string, unknown>;
    }) =>
      apiRequest(`/admin/workers/${workerId}/${action}`, {
        method: "POST",
        body
      }),
    onSuccess: async (_, variables) => {
      toast.success(variables.action === "verify" ? "Worker approved" : "Worker rejected");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "workers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "verification-queue"] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to review worker")
  });

  const workers = workersQuery.data?.data ?? [];
  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId) ?? workers[0];

  useEffect(() => {
    if (workers.length === 0) {
      if (selectedWorkerId) {
        setSelectedWorkerId("");
      }
      return;
    }

    if (!workers.some((worker) => worker.id === selectedWorkerId)) {
      setSelectedWorkerId(workers[0].id);
    }
  }, [selectedWorkerId, workers]);

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Pending verification requests from the backend worker-review flow." title="Verification Queue" />

      {workers.length === 0 ? (
        <EmptyState description="There are no submitted worker verifications right now." title="Queue is empty" />
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-1">
          {workers.map((worker) => (
            <Card
              className={worker.id === selectedWorker?.id ? "border-[rgba(65,150,70,0.26)] shadow-[0_22px_45px_rgba(65,150,70,0.14)]" : undefined}
              key={worker.id}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>{worker.displayName || "Unnamed worker"}</CardTitle>
                    <CardDescription>{worker.headline || "No worker headline yet"}</CardDescription>
                  </div>
                  <Badge variant={getStatusBadgeVariant(worker.verificationStatus)}>{worker.verificationStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.25rem] bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Trades: <span className="font-semibold">{worker.trades.join(", ") || "No trades on profile"}</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => setSelectedWorkerId(worker.id)}
                    variant={worker.id === selectedWorker?.id ? "primary" : "outline"}
                  >
                    {worker.id === selectedWorker?.id ? "Reviewing now" : "Review in desk"}
                  </Button>
                  <Link className="inline-flex" to={`/verification/${worker.id}`}>
                    <Button variant="outline">
                      Review evidence
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>

          <ActionDesk description="Review notes persist through the worker verification admin endpoints." title="Verification action desk">
            {selectedWorker ? (
              <>
                <div className="rounded-[1.25rem] bg-[rgba(255,251,244,0.92)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[color:var(--jo-ink)]">{selectedWorker.displayName || "Unnamed worker"}</p>
                      <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{selectedWorker.headline || "No worker headline yet"}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(selectedWorker.verificationStatus)}>{selectedWorker.verificationStatus}</Badge>
                  </div>
                  <p className="mt-4 text-sm text-[color:var(--jo-muted)]">Trades: {selectedWorker.trades.join(", ") || "No trades on profile"}</p>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Approval notes</span>
                  <Textarea className="min-h-[116px]" onChange={(event) => setApprovalNotes(event.target.value)} value={approvalNotes} />
                </label>

                <Button
                  disabled={reviewMutation.isPending}
                  onClick={() =>
                    reviewMutation.mutate({
                      workerId: selectedWorker.id,
                      action: "verify",
                      body: approvalNotes.trim() ? { notes: approvalNotes.trim() } : {}
                    })
                  }
                  variant="success"
                >
                  <BadgeCheck className="h-4 w-4" />
                  Approve selected worker
                </Button>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Rejection reason</span>
                  <Textarea className="min-h-[132px]" onChange={(event) => setReviewNotes(event.target.value)} value={reviewNotes} />
                </label>

                <Button
                  disabled={reviewMutation.isPending || reviewNotes.trim().length < 10}
                  onClick={() =>
                    reviewMutation.mutate({
                      workerId: selectedWorker.id,
                      action: "reject-verification",
                      body: { reviewNotes: reviewNotes.trim() }
                    })
                  }
                  variant="danger"
                >
                  Reject selected worker
                </Button>

                <Link className="inline-flex" to={`/verification/${selectedWorker.id}`}>
                  <Button variant="outline">Open verification detail</Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-[color:var(--jo-muted)]">Select a pending worker to review the submission.</p>
            )}
          </ActionDesk>
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={workersQuery.data?.pagination} />
    </div>
  );
};

const FeaturedWorkersPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [featuredOnly, setFeaturedOnly] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [featureNotes, setFeatureNotes] = useState("Feature placement enabled by admin");
  const [extensionNotes, setExtensionNotes] = useState("Extended featured worker placement");
  const [extensionEndsAt, setExtensionEndsAt] = useState(toDateTimeLocalValue(defaultFeaturedExtensionEndsAt()));

  const searchParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10"
    });

    if (featuredOnly) {
      params.set("isFeatured", featuredOnly);
    }

    return params.toString();
  }, [featuredOnly, page]);

  const featuredQuery = useQuery({
    queryKey: ["admin", "featured-workers", page, featuredOnly],
    queryFn: () => apiPaginatedRequest<FeaturedWorkerItem>(`/admin/featured-workers?${searchParams}`)
  });

  const actionMutation = useMutation({
    mutationFn: async ({ workerId, action, body }: { workerId: string; action: "ENABLE" | "DISABLE" | "EXTEND"; body: Record<string, unknown> }) =>
      apiRequest(`/admin/featured-workers/${workerId}`, {
        method: "PATCH",
        body: {
          action,
          ...body
        }
      }),
    onSuccess: async (_, variables) => {
      toast.success(`Featured worker ${variables.action.toLowerCase()}d`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "featured-workers"] });
    },
    onError: (error) => handleActionError(error, "Unable to update featured worker")
  });

  const workers = featuredQuery.data?.data ?? [];
  const selectedWorker = workers.find((worker) => worker.id === selectedWorkerId) ?? workers[0];

  useEffect(() => {
    if (workers.length === 0) {
      if (selectedWorkerId) {
        setSelectedWorkerId("");
      }
      return;
    }

    if (!workers.some((worker) => worker.id === selectedWorkerId)) {
      setSelectedWorkerId(workers[0].id);
    }
  }, [selectedWorkerId, workers]);

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Subscription-backed featured worker controls for boosted marketplace placement." title="Featured Workers" />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Filter</span>
          <Select
            onChange={(event) => {
              setFeaturedOnly(event.target.value);
              setPage(1);
            }}
            value={featuredOnly}
          >
            <option value="">All workers</option>
            <option value="true">Featured only</option>
            <option value="false">Not featured</option>
          </Select>
        </label>

        <Card className="border-dashed lg:col-span-2">
          <CardContent className="flex h-full items-center justify-between gap-4 pt-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Workers loaded</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(featuredQuery.data?.pagination.total ?? 0)}</p>
            </div>
            <Users className="h-10 w-10 text-slate-300" />
          </CardContent>
        </Card>
      </FilterCard>

      {workers.length === 0 ? (
        <EmptyState description="No featured-worker entries matched the current filter." title="No workers found" />
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-1">
          {workers.map((worker) => (
            <Card
              className={worker.id === selectedWorker?.id ? "border-[rgba(65,150,70,0.26)] shadow-[0_22px_45px_rgba(65,150,70,0.14)]" : undefined}
              key={worker.id}
            >
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{worker.displayName || "Unnamed worker"}</CardTitle>
                  <CardDescription>{worker.headline || "No worker headline yet"}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={worker.isFeatured ? "purple" : "slate"}>{worker.isFeatured ? "FEATURED" : "STANDARD"}</Badge>
                  <Badge variant={getStatusBadgeVariant(worker.verificationStatus)}>{worker.verificationStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Latest subscription</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {worker.subscriptions[0] ? `${worker.subscriptions[0].status} until ${formatDateTime(worker.subscriptions[0].endsAt)}` : "No subscription"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      setSelectedWorkerId(worker.id);
                      setFeatureNotes(worker.isFeatured ? "Feature placement disabled by admin" : "Feature placement enabled by admin");
                      setExtensionNotes("Extended featured worker placement");
                      setExtensionEndsAt(toDateTimeLocalValue(defaultFeaturedExtensionEndsAt()));
                    }}
                    variant={worker.id === selectedWorker?.id ? "primary" : "outline"}
                  >
                    {worker.id === selectedWorker?.id ? "Managing now" : "Manage placement"}
                  </Button>
                  <Link className="inline-flex" to={`/workers/${worker.id}`}>
                    <Button variant="outline">
                      Open detail
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link className="inline-flex" to={`/workers/${worker.id}/subscription`}>
                    <Button variant="outline">Subscription detail</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>

          <ActionDesk description="Manage featured placement, extension windows, and notes against the live featured-worker endpoints." title="Featured placement desk">
            {selectedWorker ? (
              <>
                <div className="rounded-[1.25rem] bg-[rgba(255,251,244,0.92)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[color:var(--jo-ink)]">{selectedWorker.displayName || "Unnamed worker"}</p>
                      <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{selectedWorker.headline || "No worker headline yet"}</p>
                    </div>
                    <Badge variant={selectedWorker.isFeatured ? "purple" : "slate"}>{selectedWorker.isFeatured ? "FEATURED" : "STANDARD"}</Badge>
                  </div>
                  <p className="mt-4 text-sm text-[color:var(--jo-muted)]">
                    Current subscription:{" "}
                    <span className="font-semibold text-[color:var(--jo-ink)]">
                      {selectedWorker.subscriptions[0] ? `${selectedWorker.subscriptions[0].status} until ${formatDateTime(selectedWorker.subscriptions[0].endsAt)}` : "No subscription"}
                    </span>
                  </p>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[color:var(--jo-ink)]">{selectedWorker.isFeatured ? "Disable note" : "Enable note"}</span>
                  <Textarea className="min-h-[120px]" onChange={(event) => setFeatureNotes(event.target.value)} value={featureNotes} />
                </label>

                <Button
                  disabled={actionMutation.isPending || featureNotes.trim().length < 5}
                  onClick={() =>
                    actionMutation.mutate({
                      workerId: selectedWorker.id,
                      action: selectedWorker.isFeatured ? "DISABLE" : "ENABLE",
                      body: { notes: featureNotes.trim() }
                    })
                  }
                  variant={selectedWorker.isFeatured ? "danger" : "primary"}
                >
                  {selectedWorker.isFeatured ? "Disable featured placement" : "Enable featured placement"}
                </Button>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Extension end time</span>
                  <Input onChange={(event) => setExtensionEndsAt(event.target.value)} type="datetime-local" value={extensionEndsAt} />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[color:var(--jo-ink)]">Extension note</span>
                  <Textarea className="min-h-[120px]" onChange={(event) => setExtensionNotes(event.target.value)} value={extensionNotes} />
                </label>

                <Button
                  disabled={actionMutation.isPending || extensionNotes.trim().length < 5 || !extensionEndsAt}
                  onClick={() =>
                    actionMutation.mutate({
                      workerId: selectedWorker.id,
                      action: "EXTEND",
                      body: {
                        endsAt: new Date(extensionEndsAt).toISOString(),
                        notes: extensionNotes.trim()
                      }
                    })
                  }
                  variant="outline"
                >
                  Extend placement window
                </Button>
              </>
            ) : (
              <p className="text-sm text-[color:var(--jo-muted)]">Select a worker to manage featured placement.</p>
            )}
          </ActionDesk>
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={featuredQuery.data?.pagination} />
    </div>
  );
};

export { FeaturedWorkersPage, UsersPage, VerificationQueuePage, WorkersPage };
