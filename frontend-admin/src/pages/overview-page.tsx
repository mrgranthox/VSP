import { useQuery } from "@tanstack/react-query";
import { Activity, BadgeCheck, BriefcaseBusiness, CalendarCheck2, Users } from "lucide-react";

import { AreaTrendCard, BarMetricCard, DonutChartCard } from "@/components/admin/lazy-dashboard-charts";
import { InsightMetricCard, RevenueRibbon } from "@/components/admin/dashboard-metrics";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { EngagementAnalytics, MarketplaceAnalytics, OverviewAnalytics, SearchAnalytics, SystemHealth, SystemMetrics } from "@/types/admin";

const OverviewPage = () => {
  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => apiRequest<OverviewAnalytics>("/admin/analytics/overview")
  });
  const searchQuery = useQuery({
    queryKey: ["admin", "analytics", "search"],
    queryFn: () => apiRequest<SearchAnalytics>("/admin/analytics/search")
  });
  const engagementQuery = useQuery({
    queryKey: ["admin", "analytics", "engagement"],
    queryFn: () => apiRequest<EngagementAnalytics>("/admin/analytics/engagement")
  });
  const marketplaceQuery = useQuery({
    queryKey: ["admin", "analytics", "marketplace"],
    queryFn: () => apiRequest<MarketplaceAnalytics>("/admin/analytics/marketplace")
  });
  const healthQuery = useQuery({
    queryKey: ["admin", "system-health"],
    queryFn: () => apiRequest<SystemHealth>("/admin/system/health")
  });
  const metricsQuery = useQuery({
    queryKey: ["admin", "system-metrics"],
    queryFn: () => apiRequest<SystemMetrics>("/admin/system/metrics")
  });

  const overview = overviewQuery.data;
  const engagement = engagementQuery.data;
  const search = searchQuery.data;
  const marketplace = marketplaceQuery.data;
  const health = healthQuery.data;
  const metrics = metricsQuery.data;

  const searchTrend = (search?.topQueries ?? []).slice(0, 6).map((item, index) => ({
    label: item.queryText?.slice(0, 14) || `Q${index + 1}`,
    value: item._count._all
  }));
  const requestMix = (marketplace?.serviceRequests ?? []).map((entry) => ({
    name: entry.status,
    value: entry._count._all
  }));
  const bookingMix = (marketplace?.bookings ?? []).map((entry) => ({
    name: entry.status,
    value: entry._count._all
  }));
  const engagementMix = [
    { name: "Posts", value: engagement?.posts ?? 0 },
    { name: "Comments", value: engagement?.comments ?? 0 },
    { name: "Messages", value: engagement?.messages ?? 0 },
    { name: "Reviews", value: engagement?.reviews ?? 0 },
    { name: "Notifications", value: engagement?.notifications ?? 0 }
  ];

  return (
    <div className="space-y-6" data-testid="overview-page">
      <PageHeader subtitle="Live executive summary spanning marketplace demand, content engagement, search behavior, and infrastructure readiness." title="Overview Dashboard" />

      <RevenueRibbon amountMinor={overview?.revenueMinor ?? 0} subtitle="Succeeded marketplace payment volume, paired with live request, booking, and engagement telemetry from the admin analytics layer." title="Revenue pulse" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <InsightMetricCard accent="linear-gradient(135deg,#419646,#8bc08d)" helper="Registered users in the active analytics window." icon={Users} label="Users" value={formatNumber(overview?.users ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#f6b313,#ffd25e)" helper="Approved worker accounts currently in the marketplace." icon={BadgeCheck} label="Approved workers" value={formatNumber(overview?.workersApproved ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#e9779b,#f4acc4)" helper="Requests that are still open, matched, accepted, or in progress." icon={BriefcaseBusiness} label="Open demand" value={formatNumber(overview?.requestsOpen ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#ff4b19,#ff8c63)" helper="Completed bookings across the current analytics window." icon={CalendarCheck2} label="Completed jobs" value={formatNumber(overview?.bookingsCompleted ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#173328,#4c6e63)" helper="Websocket connections and real-time infrastructure heartbeat." icon={Activity} label="Live sockets" value={formatNumber(health?.websocketConnections ?? 0)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightMetricCard accent="linear-gradient(135deg,#1c5f3b,#6dbb78)" helper="Accounts with at least one non-revoked active session right now." icon={Users} label="Users online" value={formatNumber(overview?.onlineUsers ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#145a6c,#5ea8b5)" helper="Worker profiles whose linked accounts currently hold an active session." icon={BriefcaseBusiness} label="Workers online" value={formatNumber(overview?.onlineWorkers ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#7a3d12,#f39a4b)" helper="Open support cases still waiting on an operator or user." icon={CalendarCheck2} label="Open support" value={formatNumber(overview?.openSupportTickets ?? 0)} />
        <InsightMetricCard accent="linear-gradient(135deg,#7f2139,#ea779b)" helper="Open or reviewed fraud signals that still need a trust decision." icon={Activity} label="Open fraud" value={formatNumber(overview?.openFraudSignals ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AreaTrendCard data={searchTrend} description="Top query buckets from the search analytics endpoint, rendered as a quick trend surface for admin demand sensing." title="Search demand trend" value={`${formatNumber(search?.impressionCount ?? 0)} impressions`} />
        <DonutChartCard centerLabel="engagement" centerValue={formatNumber(engagementMix.reduce((sum, item) => sum + item.value, 0))} data={engagementMix} description="Social, messaging, reviews, and notification volume across the platform." title="Engagement mix" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BarMetricCard data={requestMix} description="Request lifecycle distribution across all marketplace demand currently recorded by admin analytics." title="Service-request status mix" />
        <BarMetricCard data={bookingMix} description="Booking lifecycle distribution, useful for spotting execution bottlenecks and cancellations." title="Booking status mix" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="overflow-hidden border-white/70 bg-white/95">
          <CardHeader>
            <CardTitle>Operational readiness</CardTitle>
            <CardDescription>Dependency health and runtime totals from the system-health and system-metrics admin endpoints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
              {[
                { label: "Database", ok: health?.database.ok, detail: `${health?.database.latencyMs ?? 0} ms` },
                { label: "Redis", ok: health?.redis.ok, detail: `${health?.redis.latencyMs ?? 0} ms · ${health?.redis.memoryUsedMb ?? "?"} MB` },
                { label: "Typesense", ok: health?.typesense.enabled ? health.typesense.docCount !== null : true, detail: health?.typesense.enabled ? `${health.typesense.docCount ?? 0} docs` : "Disabled" },
                { label: "Marketplace totals", ok: true, detail: `${formatNumber(metrics?.totals.requests ?? 0)} requests · ${formatNumber(metrics?.totals.bookings ?? 0)} bookings` }
            ].map((item) => (
              <div className="flex items-center justify-between rounded-[1.25rem] border border-slate-100 bg-slate-50/80 px-4 py-3" key={item.label}>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.detail}</p>
                </div>
                <Badge variant={item.ok ? "green" : "red"}>{item.ok ? "Healthy" : "Attention"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="overflow-hidden border-white/70 bg-white/95">
            <CardHeader>
              <CardTitle>Runtime footprint</CardTitle>
              <CardDescription>Live operational totals pulled from the backend health and metrics endpoints.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Active websocket connections", value: formatNumber(health?.websocketConnections ?? 0), detail: "Live realtime sessions reported by the gateway" },
                { label: "Search documents", value: formatNumber(health?.typesense.docCount ?? 0), detail: health?.typesense.enabled ? "Indexed Typesense records" : "Search index disabled" },
                { label: "Recent job runs", value: formatNumber(health?.recentJobRuns.length ?? 0), detail: "Latest worker and scheduler executions in the health payload" },
                { label: "Revenue total", value: formatNumber((overview?.revenueMinor ?? 0) / 100), detail: "Marketplace revenue reported by analytics overview" },
                { label: "Suspended users", value: formatNumber(overview?.suspendedUsers ?? 0), detail: "Accounts currently in a restricted lifecycle state" },
                { label: "Open moderation cases", value: formatNumber(overview?.openModerationCases ?? 0), detail: "Cases that still need review, action, or closure" }
              ].map((item) => (
                <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 px-4 py-3" key={item.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/70 bg-white/95">
          <CardHeader>
            <CardTitle>Recent job ledger</CardTitle>
            <CardDescription>The latest recurring and worker-triggered job runs from the backend job ledger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(health?.recentJobRuns ?? []).slice(0, 6).map((job) => (
              <div className="rounded-[1.25rem] border border-slate-100 bg-slate-50/80 p-4" key={job.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{job.jobName}</p>
                    <p className="text-sm text-slate-500">{job.queueName ?? "unknown queue"}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {formatDateTime(job.startedAt)} to {formatDateTime(job.finishedAt ?? null)}
                </p>
              </div>
            ))}
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export { OverviewPage };
