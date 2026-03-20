import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, ShieldAlert, Star, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { EmptyState, FilterCard, PaginationControls } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const UsersPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

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
        <div className="grid gap-4 xl:grid-cols-2">
          {users.map((user) => {
            const displayName =
              user.profile?.displayName || [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim() || user.email || "Unknown user";

            return (
              <Card key={user.id}>
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
                    <Link className="inline-flex" to={`/users/${user.id}`}>
                      <Button variant="outline">
                        Open detail
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>

                    {user.status === "ACTIVE" ? (
                      <Button
                        onClick={() => {
                          const reason = window.prompt("Reason for suspension", "Manual admin review");

                          if (!reason) {
                            return;
                          }

                          changeStatusMutation.mutate({
                            userId: user.id,
                            action: "suspend",
                            body: { reason }
                          });
                        }}
                        variant="danger"
                      >
                        Suspend user
                      </Button>
                    ) : null}

                    {user.status === "SUSPENDED" ? (
                      <Button
                        onClick={() => {
                          const notes = window.prompt("Reactivation notes", "Manual reactivation");
                          changeStatusMutation.mutate({
                            userId: user.id,
                            action: "reactivate",
                            body: notes ? { notes } : {}
                          });
                        }}
                        variant="success"
                      >
                        Reactivate
                      </Button>
                    ) : null}

                    {user.workerProfile ? (
                      <Link className="inline-flex" to="/workers">
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

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Pending verification requests from the backend worker-review flow." title="Verification Queue" />

      {workers.length === 0 ? (
        <EmptyState description="There are no submitted worker verifications right now." title="Queue is empty" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {workers.map((worker) => (
            <Card key={worker.id}>
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
                  <Link className="inline-flex" to={`/workers/${worker.id}`}>
                    <Button variant="outline">
                      Open detail
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    onClick={() => {
                      const notes = window.prompt("Approval notes", "Verification approved by admin");

                      reviewMutation.mutate({
                        workerId: worker.id,
                        action: "verify",
                        body: notes ? { notes } : {}
                      });
                    }}
                    variant="success"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      const reviewNotes = window.prompt("Rejection reason", "Please upload clearer verification documents.");

                      if (!reviewNotes) {
                        return;
                      }

                      reviewMutation.mutate({
                        workerId: worker.id,
                        action: "reject-verification",
                        body: { reviewNotes }
                      });
                    }}
                    variant="danger"
                  >
                    Reject
                  </Button>
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

const FeaturedWorkersPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [featuredOnly, setFeaturedOnly] = useState("");

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
        <div className="grid gap-4 xl:grid-cols-2">
          {workers.map((worker) => (
            <Card key={worker.id}>
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
                  <Link className="inline-flex" to={`/workers/${worker.id}`}>
                    <Button variant="outline">
                      Open detail
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  {worker.isFeatured ? (
                    <Button
                      onClick={() => {
                        const notes = window.prompt("Disable note", "Feature placement disabled by admin");

                        if (!notes) {
                          return;
                        }

                        actionMutation.mutate({
                          workerId: worker.id,
                          action: "DISABLE",
                          body: { notes }
                        });
                      }}
                      variant="danger"
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        const notes = window.prompt("Enable note", "Feature placement enabled by admin");

                        if (!notes) {
                          return;
                        }

                        actionMutation.mutate({
                          workerId: worker.id,
                          action: "ENABLE",
                          body: { notes }
                        });
                      }}
                    >
                      Enable
                    </Button>
                  )}

                  <Button
                    onClick={() => {
                      const endsAt = window.prompt("Extension end date (ISO format)", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
                      const notes = window.prompt("Extension note", "Extended featured worker placement");

                      if (!endsAt || !notes) {
                        return;
                      }

                      actionMutation.mutate({
                        workerId: worker.id,
                        action: "EXTEND",
                        body: { endsAt, notes }
                      });
                    }}
                    variant="outline"
                  >
                    Extend
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={featuredQuery.data?.pagination} />
    </div>
  );
};

export { FeaturedWorkersPage, UsersPage, VerificationQueuePage, WorkersPage };
