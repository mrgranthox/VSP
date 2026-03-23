import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Flag, MessageSquareWarning, ShieldAlert } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AreaTrendCard, DonutChartCard } from "@/components/admin/lazy-dashboard-charts";
import { InsightMetricCard } from "@/components/admin/dashboard-metrics";
import { useCurrentAdmin } from "@/features/auth/auth";
import { ContentSnapshot } from "@/pages/admin-detail-pages.shared";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiPaginatedRequest, apiRequest, getApiErrorMessage } from "@/lib/api";
import { hasPermission } from "@/lib/admin-permissions";
import { formatDateTime, formatDisplayName, formatNumber } from "@/lib/utils";
import type { AdminContentView, AdminReportDetail, AdminReportListItem } from "@/types/admin";

interface AdminPostItem {
  id: string;
  authorUserId: string;
  authorDisplayName?: string | null;
  body: string;
  visibility: string;
  isDeleted: boolean;
  createdAt: string;
  mediaCount: number;
  likeCount: number;
  commentCount: number;
}

const handleActionError = (error: unknown, fallback: string) => toast.error(getApiErrorMessage(error, fallback));

const buildContentOpsRecommendations = (report?: AdminReportDetail | null, contentView?: AdminContentView | null) => {
  const recommendations: string[] = [];
  const moderationHistory = contentView?.moderationHistory ?? [];
  const totalCases = moderationHistory.reduce((sum, item) => sum + item.moderationCases.length, 0);

  if (report?.status === "OPEN") {
    recommendations.push("Move this report into UNDER_REVIEW once an operator has inspected the linked content and decided who owns the trust action.");
  }

  if (report?.severity === "CRITICAL" || report?.severity === "HIGH") {
    recommendations.push("High-severity content should not stay informational only. Capture a moderation action or destructive decision before leaving the desk.");
  }

  if (moderationHistory.length > 0 && totalCases === 0) {
    recommendations.push("This content has reports but no moderation case. Escalate to case handling if the investigation requires a tracked trust workflow.");
  }

  if ((contentView?.entityType === "post" || contentView?.entityType === "comment") && !("isDeleted" in (contentView?.content ?? {}))) {
    recommendations.push("Review the raw payload and count fields before taking a delete action so the audit trail reflects the exact evidence that was removed.");
  }

  return recommendations;
};

const ContentOperationsPage = () => {
  const queryClient = useQueryClient();
  const adminQuery = useCurrentAdmin();
  const roles = adminQuery.data?.roles ?? [];
  const [postSearch, setPostSearch] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const deferredPostSearch = useDeferredValue(postSearch);

  const postsQuery = useQuery({
    queryKey: ["admin", "posts", deferredPostSearch],
    queryFn: () => apiPaginatedRequest<AdminPostItem>(`/admin/posts?page=1&limit=12${deferredPostSearch.trim() ? `&q=${encodeURIComponent(deferredPostSearch.trim())}` : ""}`)
  });
  const reportsQuery = useQuery({
    queryKey: ["admin", "reports", "content-ops"],
    queryFn: () => apiPaginatedRequest<AdminReportListItem>("/admin/reports?page=1&limit=8")
  });

  const posts = postsQuery.data?.data ?? [];
  const reports = reportsQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedPostId && posts[0]) {
      setSelectedPostId(posts[0].id);
    }
  }, [posts, selectedPostId]);

  useEffect(() => {
    if (!selectedReportId && reports[0]) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  const postContentQuery = useQuery({
    queryKey: ["admin", "content", "post", selectedPostId],
    queryFn: () => apiRequest<AdminContentView>(`/admin/content/post/${selectedPostId}`),
    enabled: Boolean(selectedPostId)
  });
  const reportDetailQuery = useQuery({
    queryKey: ["admin", "reports", "content-ops", selectedReportId],
    queryFn: () => apiRequest<AdminReportDetail>(`/admin/reports/${selectedReportId}`),
    enabled: Boolean(selectedReportId)
  });
  const linkedContentQuery = useQuery({
    queryKey: ["admin", "content", "linked-report", selectedReportId],
    queryFn: async () => {
      const report = await apiRequest<AdminReportDetail>(`/admin/reports/${selectedReportId}`);
      return apiRequest<AdminContentView>(`/admin/content/${report.entityType}/${report.entityId}`);
    },
    enabled: Boolean(selectedReportId)
  });

  const deleteMutation = useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: "post" | "comment" | "review"; entityId: string }) => {
      const path = entityType === "post" ? `/admin/posts/${entityId}` : entityType === "comment" ? `/admin/comments/${entityId}` : `/admin/reviews/${entityId}`;

      return apiRequest(path, {
        method: "DELETE"
      });
    },
    onSuccess: async (_, variables) => {
      toast.success(`${variables.entityType} removed`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "posts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "reports", "content-ops"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "content"] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to remove content")
  });

  const reportStatusMutation = useMutation({
    mutationFn: (nextStatus: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED") =>
      apiRequest<{ updatedCount: number }>("/admin/reports/bulk", {
        method: "PATCH",
        body: {
          reportIds: selectedReportId ? [selectedReportId] : [],
          status: nextStatus,
          notes: `Content operations status move to ${nextStatus}.`
        }
      }),
    onSuccess: async (_, nextStatus) => {
      toast.success(`Report moved to ${nextStatus.replaceAll("_", " ").toLowerCase()}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "reports", "content-ops", selectedReportId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "content", "linked-report", selectedReportId] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to update report status")
  });

  const contentMix = useMemo(
    () => [
      { name: "Posts", value: posts.length },
      { name: "Reports", value: reports.length },
      { name: "Comments", value: posts.reduce((total, item) => total + item.commentCount, 0) },
      { name: "Media", value: posts.reduce((total, item) => total + item.mediaCount, 0) }
    ],
    [posts, reports]
  );

  const moderationSeverityMix = useMemo(() => {
    const counts = new Map<string, number>();

    reports.forEach((report) => {
      counts.set(report.severity, (counts.get(report.severity) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const activityTrend = useMemo(
    () =>
      posts
        .slice(0, 6)
        .reverse()
        .map((post, index) => ({
          label: `P${index + 1}`,
          value: post.commentCount + post.likeCount + 1
        })),
    [posts]
  );

  const linkedContent = linkedContentQuery.data;
  const linkedContentType = linkedContent?.entityType;
  const canDeletePosts = hasPermission(roles, "POST_DELETE");
  const canDeleteComments = hasPermission(roles, "COMMENT_DELETE");
  const canDeleteReviews = hasPermission(roles, "REVIEW_DELETE");

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Unified content command center for posts, linked evidence, reports, and delete actions across moderation-owned entities." title="Content Operations" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightMetricCard accent="linear-gradient(135deg,#419646,#8bc08d)" helper="Posts currently visible in the moderation index." icon={Eye} label="Indexed posts" value={formatNumber(postsQuery.data?.pagination.total ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#F6B313,#FFD25E)" helper="Open report items loaded into this command center." icon={Flag} label="Reports loaded" value={formatNumber(reportsQuery.data?.pagination.total ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#E9779B,#F4ACC4)" helper="Comment interactions across visible posts." icon={MessageSquareWarning} label="Comment volume" value={formatNumber(posts.reduce((total, item) => total + item.commentCount, 0))} />
        <InsightMetricCard accent="linear-gradient(135deg,#FF4B19,#FF8C63)" helper="Media attachments attached to visible posts." icon={ShieldAlert} label="Media attachments" value={formatNumber(posts.reduce((total, item) => total + item.mediaCount, 0))} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DonutChartCard centerLabel="content surface" centerValue={formatNumber(contentMix.reduce((sum, item) => sum + item.value, 0))} data={contentMix} description="Posts, comments, reports, and media footprint in the current moderation slice." title="Content mix" />
        <DonutChartCard centerLabel="severity" centerValue={formatNumber(moderationSeverityMix.reduce((sum, item) => sum + item.value, 0))} data={moderationSeverityMix} description="Severity distribution across the current report queue." title="Moderation severity" />
        <AreaTrendCard data={activityTrend} description="A simple activity index built from visible posts and their interaction counts." title="Visible activity trend" value={`${activityTrend.length} samples`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden border-white/70 bg-white/95">
          <CardHeader>
            <CardTitle>Posts inventory</CardTitle>
            <CardDescription>Search the live admin posts feed and inspect individual content records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input onChange={(event) => setPostSearch(event.target.value)} placeholder="Search post body" value={postSearch} />

            <div className="space-y-3">
              {posts.map((post) => (
                <button
                  className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition ${
                    selectedPostId === post.id ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                  }`}
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{post.authorDisplayName || post.authorUserId}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{post.body}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(post.visibility)}>{post.visibility}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span>{formatDateTime(post.createdAt)}</span>
                    <span>{formatNumber(post.mediaCount)} media</span>
                    <span>{formatNumber(post.commentCount)} comments</span>
                    <span>{formatNumber(post.likeCount)} likes</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ContentSnapshot contentView={postContentQuery.data} />

          {postContentQuery.data ? (
            <Card className="overflow-hidden border-white/70 bg-white/95">
              <CardHeader>
                <CardTitle>Moderation footprint</CardTitle>
                <CardDescription>Use this quick read before deleting or escalating content so the evidence trail stays defensible.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Reports</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{formatNumber(postContentQuery.data.moderationHistory.length)}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Cases</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {formatNumber(postContentQuery.data.moderationHistory.reduce((sum, item) => sum + item.moderationCases.length, 0))}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-100 bg-slate-50/80 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Entity type</p>
                    <p className="mt-2 text-lg font-black text-slate-950">{postContentQuery.data.entityType}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {buildContentOpsRecommendations(undefined, postContentQuery.data).length > 0 ? (
                    buildContentOpsRecommendations(undefined, postContentQuery.data).map((recommendation) => (
                      <div className="rounded-[1.15rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3 text-sm text-slate-700" key={recommendation}>
                        {recommendation}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.15rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3 text-sm text-slate-700">
                      No special moderation guidance is needed for this selected content right now.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {postContentQuery.data && canDeletePosts ? (
            <Card className="overflow-hidden border-red-100 bg-red-50/80">
              <CardHeader>
                <CardTitle>Content action</CardTitle>
                <CardDescription>Delete the selected post directly from the admin content lane.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Link className="inline-flex" to={`/content/post/${postContentQuery.data.entityId}`}>
                    <Button variant="outline">
                      Open dedicated viewer
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ entityType: "post", entityId: postContentQuery.data.entityId })}
                    variant="danger"
                  >
                    Delete selected post
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden border-white/70 bg-white/95">
          <CardHeader>
            <CardTitle>Reports spotlight</CardTitle>
            <CardDescription>Select a report to pull its full detail record and the linked content evidence.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.map((report) => (
              <button
                className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition ${
                  selectedReportId === report.id ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                key={report.id}
                onClick={() => setSelectedReportId(report.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{report.reason}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {report.entityType} · {report.entityId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusBadgeVariant(report.status)}>{report.status}</Badge>
                    <Badge variant={getStatusBadgeVariant(report.severity)}>{report.severity}</Badge>
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{formatDateTime(report.createdAt)}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {reportDetailQuery.data ? (
            <Card className="overflow-hidden border-white/70 bg-white/95">
              <CardHeader>
                <CardTitle>{reportDetailQuery.data.reason}</CardTitle>
                <CardDescription>
                  Reporter: {formatDisplayName(reportDetailQuery.data.reporterUser?.profile, reportDetailQuery.data.reporterUser?.email ?? "Unknown reporter")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getStatusBadgeVariant(reportDetailQuery.data.status)}>{reportDetailQuery.data.status}</Badge>
                  <Badge variant={getStatusBadgeVariant(reportDetailQuery.data.severity)}>{reportDetailQuery.data.severity}</Badge>
                  <Badge variant="blue">{reportDetailQuery.data.entityType}</Badge>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const).map((nextStatus) => (
                    <Button
                      disabled={reportStatusMutation.isPending || reportDetailQuery.data.status === nextStatus}
                      key={nextStatus}
                      onClick={() => reportStatusMutation.mutate(nextStatus)}
                      variant={
                        reportDetailQuery.data.status === nextStatus
                          ? "outline"
                          : nextStatus === "DISMISSED"
                            ? "danger"
                            : nextStatus === "RESOLVED"
                              ? "success"
                              : "outline"
                      }
                    >
                      {reportDetailQuery.data.status === nextStatus ? `${nextStatus.replaceAll("_", " ")} now` : `Move to ${nextStatus.replaceAll("_", " ").toLowerCase()}`}
                    </Button>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {reportDetailQuery.data.moderationCases.map((caseItem) => (
                    <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4" key={caseItem.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{caseItem.id}</p>
                        <Badge variant={getStatusBadgeVariant(caseItem.status)}>{caseItem.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {formatDisplayName(caseItem.assignedAdminUser?.profile, caseItem.assignedAdminUser?.email ?? "Unassigned")}
                      </p>
                      <Link className="mt-3 inline-flex" to={`/moderation-cases/${caseItem.id}`}>
                        <Button variant="outline">
                          Open case
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
                <Link className="inline-flex" to={`/reports/${reportDetailQuery.data.id}`}>
                  <Button variant="outline">
                    Open full report detail
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Link className="inline-flex" to={`/content/${reportDetailQuery.data.entityType}/${reportDetailQuery.data.entityId}`}>
                  <Button variant="outline">
                    Open content viewer
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="space-y-2">
                  {buildContentOpsRecommendations(reportDetailQuery.data, linkedContentQuery.data).length > 0 ? (
                    buildContentOpsRecommendations(reportDetailQuery.data, linkedContentQuery.data).map((recommendation) => (
                      <div className="rounded-[1.15rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3 text-sm text-slate-700" key={recommendation}>
                        {recommendation}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.15rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3 text-sm text-slate-700">
                      This report already has enough context loaded for a straightforward operator decision.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <ContentSnapshot contentView={linkedContentQuery.data} />

          {linkedContent &&
          ((linkedContentType === "comment" && canDeleteComments) || (linkedContentType === "review" && canDeleteReviews)) ? (
            <Card className="overflow-hidden border-red-100 bg-red-50/80">
              <CardHeader>
                <CardTitle>Content action</CardTitle>
                <CardDescription>Delete the report-linked comment or review directly from this moderation lane.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ entityType: linkedContentType, entityId: linkedContent.entityId })}
                  variant="danger"
                >
                  Delete linked {linkedContentType}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export { ContentOperationsPage };
