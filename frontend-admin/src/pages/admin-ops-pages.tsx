import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, HeadphonesIcon, ShieldAlert, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { EmptyState, FilterCard, PaginationControls } from "@/components/admin/list-controls";
import { ContentSnapshot } from "@/pages/admin-detail-pages.shared";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Badge, getStatusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCurrentAdmin } from "@/features/auth/auth";
import { apiPaginatedRequest, apiRequest, getApiErrorMessage, isMfaRequiredError } from "@/lib/api";
import { formatDateTime, formatDisplayName, formatJsonValue, formatNumber } from "@/lib/utils";
import type {
  AdminAuditLogItem,
  AdminContentView,
  AdminModerationCaseDetail,
  AdminModerationCaseItem,
  AdminReportDetail,
  AdminReportListItem,
  AdminSupportTicketItem,
  FraudSignalItem,
  SystemHealth,
  SystemMetrics
} from "@/types/admin";

const handleActionError = (error: unknown, fallback: string) => {
  if (isMfaRequiredError(error)) {
    toast.error("Verify MFA in My Profile before running this action");
    return;
  }

  toast.error(getApiErrorMessage(error, fallback));
};

const resolveOpsEntityLink = (entityType?: string | null, entityId?: string | null) => {
  if (!entityType || !entityId) {
    return "/content";
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
      return "/content";
  }
};

const ReportsPage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10"
    });

    if (status) {
      params.set("status", status);
    }

    if (severity) {
      params.set("severity", severity);
    }

    return params.toString();
  }, [page, severity, status]);

  const reportsQuery = useQuery({
    queryKey: ["admin", "reports", page, status, severity],
    queryFn: () => apiPaginatedRequest<AdminReportListItem>(`/admin/reports?${queryString}`)
  });

  const reports = reportsQuery.data?.data ?? [];
  const selectedReport = reports.find((item) => item.id === selectedReportId) ?? reports[0];

  useEffect(() => {
    if (!selectedReportId && reports[0]) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  const reportDetailQuery = useQuery({
    queryKey: ["admin", "reports", "queue-detail", selectedReport?.id],
    queryFn: () => apiRequest<AdminReportDetail>(`/admin/reports/${selectedReport?.id}`),
    enabled: Boolean(selectedReport?.id)
  });

  const reportContentQuery = useQuery({
    queryKey: ["admin", "reports", "queue-content", selectedReport?.id],
    queryFn: async () => {
      const report = await apiRequest<AdminReportDetail>(`/admin/reports/${selectedReport?.id}`);
      return apiRequest<AdminContentView>(`/admin/content/${report.entityType}/${report.entityId}`);
    },
    enabled: Boolean(selectedReport?.id)
  });

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Content and entity reports flowing into the moderation pipeline." title="Reports Queue" />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Status</span>
          <Select
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            <option value="">All reports</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Severity</span>
          <Select
            onChange={(event) => {
              setSeverity(event.target.value);
              setPage(1);
            }}
            value={severity}
          >
            <option value="">All severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </label>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Reports in view</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(reportsQuery.data?.pagination.total ?? 0)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {reports.length === 0 ? (
        <EmptyState description="No reports matched the current filter set." title="No reports found" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className={selectedReport?.id === report.id ? "border-[rgba(65,150,70,0.24)]" : undefined}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{report.reason}</CardTitle>
                  <CardDescription>
                    {report.entityType} · {report.entityId}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getStatusBadgeVariant(report.status)}>{report.status}</Badge>
                  <Badge variant={getStatusBadgeVariant(report.severity)}>{report.severity}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Reporter</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDisplayName(report.reporterUser?.profile, report.reporterUser?.email ?? "Unknown reporter")}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(report.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.moderationCases.length > 0 ? (
                    report.moderationCases.map((moderationCase) => (
                      <Badge key={moderationCase.id} variant={getStatusBadgeVariant(moderationCase.status)}>
                        Case {moderationCase.status}
                      </Badge>
                    ))
                  ) : (
                    <Badge>No moderation case yet</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setSelectedReportId(report.id)} variant={selectedReport?.id === report.id ? "primary" : "outline"}>
                    Inspect queue item
                  </Button>
                  <Link className="inline-flex" to={`/reports/${report.id}`}>
                    <Button variant="outline">Open report detail</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          <div className="space-y-6">
            {reportDetailQuery.data ? (
              <Card className="overflow-hidden border-white/70 bg-white/95">
                <CardHeader>
                  <CardTitle>Report action desk</CardTitle>
                  <CardDescription>Review the selected report, inspect linked evidence, and move into the correct moderation workflow.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusBadgeVariant(reportDetailQuery.data.status)}>{reportDetailQuery.data.status}</Badge>
                    <Badge variant={getStatusBadgeVariant(reportDetailQuery.data.severity)}>{reportDetailQuery.data.severity}</Badge>
                    <Badge variant="blue">{reportDetailQuery.data.entityType}</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.25rem] bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Reporter</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDisplayName(reportDetailQuery.data.reporterUser?.profile, reportDetailQuery.data.reporterUser?.email ?? "Unknown reporter")}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Entity</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {reportDetailQuery.data.entityType} · {reportDetailQuery.data.entityId}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link className="inline-flex" to={`/reports/${reportDetailQuery.data.id}`}>
                      <Button variant="outline">Open full report detail</Button>
                    </Link>
                    <Link className="inline-flex" to={`/content/${reportDetailQuery.data.entityType}/${reportDetailQuery.data.entityId}`}>
                      <Button variant="outline">Open content viewer</Button>
                    </Link>
                    {reportDetailQuery.data.moderationCases[0] ? (
                      <Link className="inline-flex" to={`/moderation-cases/${reportDetailQuery.data.moderationCases[0].id}`}>
                        <Button>Open moderation case</Button>
                      </Link>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Moderation cases</p>
                    {reportDetailQuery.data.moderationCases.length === 0 ? (
                      <div className="rounded-[1.25rem] bg-slate-50 p-4 text-sm text-slate-500">No moderation case is linked yet. Use the content viewer and moderation queue to investigate further.</div>
                    ) : (
                      reportDetailQuery.data.moderationCases.map((moderationCase) => (
                        <div className="rounded-[1.25rem] bg-slate-50 p-4" key={moderationCase.id}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{moderationCase.id}</p>
                            <Badge variant={getStatusBadgeVariant(moderationCase.status)}>{moderationCase.status}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            Assignee: {formatDisplayName(moderationCase.assignedAdminUser?.profile, moderationCase.assignedAdminUser?.email ?? "Unassigned")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <ContentSnapshot contentView={reportContentQuery.data} />
          </div>
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={reportsQuery.data?.pagination} />
    </div>
  );
};

const ModerationCasesPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [actionType, setActionType] = useState("REVIEW_NOTE");
  const [actionNotes, setActionNotes] = useState("Escalated in admin console after manual review.");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10"
    });

    if (status) {
      params.set("status", status);
    }

    return params.toString();
  }, [page, status]);

  const casesQuery = useQuery({
    queryKey: ["admin", "moderation-cases", page, status],
    queryFn: () => apiPaginatedRequest<AdminModerationCaseItem>(`/admin/moderation-cases?${queryString}`)
  });

  const cases = casesQuery.data?.data ?? [];
  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? cases[0];

  useEffect(() => {
    if (!selectedCaseId && cases[0]) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

  const caseDetailQuery = useQuery({
    queryKey: ["admin", "moderation-cases", "queue-detail", selectedCase?.id],
    queryFn: () => apiRequest<AdminModerationCaseDetail>(`/admin/moderation-cases/${selectedCase?.id}`),
    enabled: Boolean(selectedCase?.id)
  });

  const caseContentQuery = useQuery({
    queryKey: ["admin", "moderation-cases", "queue-content", selectedCase?.id],
    queryFn: async () => {
      const moderationCase = await apiRequest<AdminModerationCaseDetail>(`/admin/moderation-cases/${selectedCase?.id}`);

      if (!moderationCase.report) {
        return undefined;
      }

      return apiRequest<AdminContentView>(`/admin/content/${moderationCase.report.entityType}/${moderationCase.report.entityId}`);
    },
    enabled: Boolean(selectedCase?.id)
  });

  const actionMutation = useMutation({
    mutationFn: async ({ caseId, moderationCase }: { caseId: string; moderationCase: Pick<AdminModerationCaseItem, "report"> }) => {
      if (!moderationCase.report) {
        throw new Error("Case has no linked report");
      }

      return apiRequest(`/admin/moderation-cases/${caseId}/actions`, {
        method: "POST",
        body: {
          actionType,
          entityType: moderationCase.report.entityType,
          entityId: moderationCase.report.entityId,
          notes: actionNotes
        }
      });
    },
    onSuccess: async () => {
      toast.success("Moderation action added");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "moderation-cases"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "moderation-cases", "queue-detail", selectedCase?.id] })
      ]);
    },
    onError: (error) => handleActionError(error, "Unable to update moderation case")
  });

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Moderation case handling, assignees, and action history." title="Moderation Cases" />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Status</span>
          <Select
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            <option value="">All cases</option>
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In review</option>
            <option value="ACTIONED">Actioned</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </label>

        <Card className="border-dashed lg:col-span-2">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Cases in view</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(casesQuery.data?.pagination.total ?? 0)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {cases.length === 0 ? (
        <EmptyState description="No moderation cases matched the current filter." title="No moderation cases found" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {cases.map((item) => (
            <Card className={selectedCase?.id === item.id ? "border-[rgba(65,150,70,0.24)]" : undefined} key={item.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{item.report?.reason ?? "Moderation case"}</CardTitle>
                  <CardDescription>
                    Assignee: {formatDisplayName(item.assignedAdminUser?.profile, item.assignedAdminUser?.email ?? "Unassigned")}
                  </CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Linked report</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {item.report?.entityType ?? "Unknown"} · {item.report?.entityId ?? "—"}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(item.updatedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.actions.map((action) => (
                    <Badge key={action.id} variant="blue">
                      {action.actionType}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setSelectedCaseId(item.id)} variant={selectedCase?.id === item.id ? "primary" : "outline"}>
                    Inspect case
                  </Button>
                  <Link className="inline-flex" to={`/moderation-cases/${item.id}`}>
                    <Button variant="outline">Open case detail</Button>
                  </Link>
                  {item.report ? (
                    <Link className="inline-flex" to={`/moderation-cases/${item.id}/actions/new`}>
                      <Button variant="outline">Open action panel</Button>
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          <div className="space-y-6">
            {caseDetailQuery.data ? (
              <Card className="overflow-hidden border-white/70 bg-white/95">
                <CardHeader>
                  <CardTitle>Moderation action desk</CardTitle>
                  <CardDescription>Record the next action on the selected case and inspect its evidence without leaving the queue.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusBadgeVariant(caseDetailQuery.data.status)}>{caseDetailQuery.data.status}</Badge>
                    {caseDetailQuery.data.report ? <Badge variant={getStatusBadgeVariant(caseDetailQuery.data.report.severity)}>{caseDetailQuery.data.report.severity}</Badge> : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.25rem] bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Assignee</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDisplayName(caseDetailQuery.data.assignedAdminUser?.profile, caseDetailQuery.data.assignedAdminUser?.email ?? "Unassigned")}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Linked entity</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {caseDetailQuery.data.report ? `${caseDetailQuery.data.report.entityType} · ${caseDetailQuery.data.report.entityId}` : "No linked report"}
                      </p>
                    </div>
                  </div>

                  <Select onChange={(event) => setActionType(event.target.value)} value={actionType}>
                    <option value="REVIEW_NOTE">Review note</option>
                    <option value="ESCALATE">Escalate</option>
                    <option value="CONTENT_REMOVE">Content remove</option>
                    <option value="ACCOUNT_WARNING">Account warning</option>
                    <option value="NO_ACTION">No action</option>
                  </Select>
                  <Textarea onChange={(event) => setActionNotes(event.target.value)} value={actionNotes} />

                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={!caseDetailQuery.data.report || actionMutation.isPending || actionNotes.trim().length < 4}
                      onClick={() => actionMutation.mutate({ caseId: caseDetailQuery.data.id, moderationCase: caseDetailQuery.data })}
                    >
                      Record action
                    </Button>
                    {caseDetailQuery.data.report ? (
                      <>
                        <Link className="inline-flex" to={`/moderation-cases/${caseDetailQuery.data.id}`}>
                          <Button variant="outline">Open case detail</Button>
                        </Link>
                        <Link className="inline-flex" to={resolveOpsEntityLink(caseDetailQuery.data.report.entityType, caseDetailQuery.data.report.entityId)}>
                          <Button variant="outline">Open content</Button>
                        </Link>
                      </>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Action history</p>
                    {caseDetailQuery.data.actions.length === 0 ? (
                      <div className="rounded-[1.25rem] bg-slate-50 p-4 text-sm text-slate-500">No actions have been recorded yet.</div>
                    ) : (
                      caseDetailQuery.data.actions.map((action) => (
                        <div className="rounded-[1.25rem] bg-slate-50 p-4" key={action.id}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{action.actionType}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(action.createdAt)}</p>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">{action.notes || "No note recorded."}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <ContentSnapshot contentView={caseContentQuery.data} />
          </div>
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={casesQuery.data?.pagination} />
    </div>
  );
};

const FraudSignalsPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selectedSignalId, setSelectedSignalId] = useState("");
  const [fraudAction, setFraudAction] = useState<"REVIEW" | "DISMISS" | "ACTION">("REVIEW");
  const [fraudNotes, setFraudNotes] = useState("Risk reviewed in admin console.");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10"
    });

    if (status) {
      params.set("status", status);
    }

    return params.toString();
  }, [page, status]);

  const signalsQuery = useQuery({
    queryKey: ["admin", "fraud-signals", page, status],
    queryFn: () => apiPaginatedRequest<FraudSignalItem>(`/admin/fraud-signals?${queryString}`)
  });

  const signals = signalsQuery.data?.data ?? [];
  const selectedSignal = signals.find((item) => item.id === selectedSignalId) ?? signals[0];

  useEffect(() => {
    if (!selectedSignalId && signals[0]) {
      setSelectedSignalId(signals[0].id);
    }
  }, [selectedSignalId, signals]);

  const signalMutation = useMutation({
    mutationFn: ({ signalId, action, notes }: { signalId: string; action: "REVIEW" | "DISMISS" | "ACTION"; notes: string }) =>
      apiRequest(`/admin/fraud-signals/${signalId}`, {
        method: "PATCH",
        body: {
          action,
          notes
        }
      }),
    onSuccess: async (_, variables) => {
      toast.success(`Fraud signal ${variables.action.toLowerCase()}ed`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "fraud-signals"] });
    },
    onError: (error) => handleActionError(error, "Unable to update fraud signal")
  });

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Risk signals scored by the backend fraud and moderation systems." title="Fraud Signals" />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Status</span>
          <Select
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            value={status}
          >
            <option value="">All signals</option>
            <option value="OPEN">Open</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ACTIONED">Actioned</option>
          </Select>
        </label>

        <Card className="border-dashed lg:col-span-2">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Signals in view</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(signalsQuery.data?.pagination.total ?? 0)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {signals.length === 0 ? (
        <EmptyState description="No fraud signals matched the current filter." title="No fraud signals found" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {signals.map((signal) => (
            <Card className={selectedSignal?.id === signal.id ? "border-[rgba(65,150,70,0.24)]" : undefined} key={signal.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{signal.signalKey}</CardTitle>
                  <CardDescription>
                    {signal.entityType ?? "user"} · {signal.entityId ?? signal.userId ?? "unknown"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getStatusBadgeVariant(signal.status)}>{signal.status}</Badge>
                  <Badge variant="red">Score {signal.score}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">User</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDisplayName(signal.user?.profile, signal.user?.email ?? "Unknown user")}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{formatDateTime(signal.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setSelectedSignalId(signal.id)} variant={selectedSignal?.id === signal.id ? "primary" : "outline"}>
                    Inspect signal
                  </Button>
                  <Button onClick={() => signalMutation.mutate({ signalId: signal.id, action: "REVIEW", notes: "Risk reviewed in admin console." })} variant="outline">
                    Mark reviewed
                  </Button>
                  <Button onClick={() => signalMutation.mutate({ signalId: signal.id, action: "DISMISS", notes: "Signal dismissed by admin review." })} variant="ghost">
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          <Card className="overflow-hidden border-white/70 bg-white/95">
            <CardHeader>
              <CardTitle>Fraud action desk</CardTitle>
              <CardDescription>Review the selected risk signal, record the operator note, and apply the next trust action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSignal ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusBadgeVariant(selectedSignal.status)}>{selectedSignal.status}</Badge>
                    <Badge variant="red">Score {selectedSignal.score}</Badge>
                    {selectedSignal.entityType ? <Badge variant="blue">{selectedSignal.entityType}</Badge> : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.25rem] bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">User</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDisplayName(selectedSignal.user?.profile, selectedSignal.user?.email ?? "Unknown user")}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Linked entity</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedSignal.entityType ?? "user"} · {selectedSignal.entityId ?? selectedSignal.userId ?? "unknown"}
                      </p>
                    </div>
                  </div>
                  {selectedSignal.userId ? (
                    <Link className="inline-flex" to={`/users/${selectedSignal.userId}`}>
                      <Button variant="outline">Open user detail</Button>
                    </Link>
                  ) : null}
                  <Select onChange={(event) => setFraudAction(event.target.value as "REVIEW" | "DISMISS" | "ACTION")} value={fraudAction}>
                    <option value="REVIEW">Review</option>
                    <option value="DISMISS">Dismiss</option>
                    <option value="ACTION">Action and open trust trail</option>
                  </Select>
                  <Textarea onChange={(event) => setFraudNotes(event.target.value)} value={fraudNotes} />
                  <Button
                    disabled={signalMutation.isPending || (fraudAction === "ACTION" && fraudNotes.trim().length < 4)}
                    onClick={() => signalMutation.mutate({ signalId: selectedSignal.id, action: fraudAction, notes: fraudNotes })}
                  >
                    Apply fraud action
                  </Button>
                </>
              ) : (
                <div className="rounded-[1.25rem] bg-slate-50 p-4 text-sm text-slate-500">Select a fraud signal to review and action it.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={signalsQuery.data?.pagination} />
    </div>
  );
};

const SupportTicketsPage = () => {
  const queryClient = useQueryClient();
  const adminQuery = useCurrentAdmin();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10"
    });

    if (status) {
      params.set("status", status);
    }

    if (priority) {
      params.set("priority", priority);
    }

    return params.toString();
  }, [page, priority, status]);

  const ticketsQuery = useQuery({
    queryKey: ["admin", "support-tickets", page, status, priority],
    queryFn: () => apiPaginatedRequest<AdminSupportTicketItem>(`/admin/support-tickets?${queryString}`)
  });

  const ticketMutation = useMutation({
    mutationFn: ({ ticketId, mode }: { ticketId: string; mode: "assign" | "resolve" }) => {
      if (mode === "assign") {
        return apiRequest(`/admin/support-tickets/${ticketId}/assign`, {
          method: "PATCH",
          body: {
            assignedSupportUserId: adminQuery.data?.user.id
          }
        });
      }

      return apiRequest(`/admin/support-tickets/${ticketId}/status`, {
        method: "PATCH",
        body: {
          status: "RESOLVED"
        }
      });
    },
    onSuccess: async (_, variables) => {
      toast.success(variables.mode === "assign" ? "Ticket assigned" : "Ticket marked resolved");
      await queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] });
    },
    onError: (error) => handleActionError(error, "Unable to update support ticket")
  });

  const tickets = ticketsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Support operations backed by the real support ticket module and admin assignment/status actions." title="Support Tickets" />

      <FilterCard>
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
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="WAITING_USER">Waiting user</option>
            <option value="WAITING_INTERNAL">Waiting internal</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Priority</span>
          <Select
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(1);
            }}
            value={priority}
          >
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </label>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Tickets in view</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(ticketsQuery.data?.pagination.total ?? 0)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {tickets.length === 0 ? (
        <EmptyState description="No support tickets matched the current filters." title="No tickets found" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{ticket.subject}</CardTitle>
                  <CardDescription>{ticket.body}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                  <Badge variant={getStatusBadgeVariant(ticket.priority)}>{ticket.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Opened by</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDisplayName(ticket.openedByUser?.profile, ticket.openedByUser?.email ?? "Unknown user")}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Assigned to {formatDisplayName(ticket.assignedSupportUser?.profile, ticket.assignedSupportUser?.email ?? "Nobody yet")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link className="inline-flex" to={`/support-tickets/${ticket.id}`}>
                    <Button variant="outline">Open ticket</Button>
                  </Link>
                  <Button disabled={!adminQuery.data?.user.id} onClick={() => ticketMutation.mutate({ ticketId: ticket.id, mode: "assign" })} variant="outline">
                    Assign to me
                  </Button>
                  <Button onClick={() => ticketMutation.mutate({ ticketId: ticket.id, mode: "resolve" })} variant="success">
                    Mark resolved
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={ticketsQuery.data?.pagination} />
    </div>
  );
};

const AuditLogsPage = () => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "12"
    });

    if (action.trim()) {
      params.set("action", action.trim());
    }

    if (entityType.trim()) {
      params.set("entityType", entityType.trim());
    }

    return params.toString();
  }, [action, entityType, page]);

  const auditQuery = useQuery({
    queryKey: ["admin", "audit-logs", page, action, entityType],
    queryFn: () => apiPaginatedRequest<AdminAuditLogItem>(`/admin/audit-logs?${queryString}`)
  });

  const logs = auditQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Immutable admin actions and entity changes written by the backend audit system." title="Audit Logs" />

      <FilterCard>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Action</span>
          <Input
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            placeholder="USER_SUSPENDED"
            value={action}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Entity type</span>
          <Input
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
            placeholder="user / worker_profile / booking"
            value={entityType}
          />
        </label>
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Log entries in view</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(auditQuery.data?.pagination.total ?? 0)}</p>
          </CardContent>
        </Card>
      </FilterCard>

      {logs.length === 0 ? (
        <EmptyState description="No audit entries matched the current filters." title="No audit logs found" />
      ) : (
        <div className="space-y-3">
          {logs.map((item) => (
            <Card key={item.id}>
              <CardContent className="grid gap-4 pt-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="blue">{item.action}</Badge>
                    {item.entityType ? <Badge>{item.entityType}</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    {formatDisplayName(item.adminUser?.profile, item.adminUser?.email ?? "Unknown admin")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.entityId ?? "No entity id"} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <pre className="overflow-x-auto rounded-[1.25rem] bg-slate-950 p-4 text-xs text-slate-200">{formatJsonValue(item.metadataJson ?? {})}</pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls onPageChange={setPage} pagination={auditQuery.data?.pagination} />
    </div>
  );
};

const SystemHealthPage = () => {
  const healthQuery = useQuery({
    queryKey: ["admin", "system-health"],
    queryFn: () => apiRequest<SystemHealth>("/admin/system/health")
  });
  const metricsQuery = useQuery({
    queryKey: ["admin", "system-metrics"],
    queryFn: () => apiRequest<SystemMetrics>("/admin/system/metrics")
  });

  const health = healthQuery.data;
  const metrics = metricsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Dependency status, runtime totals, and recent recurring job executions." title="System Health" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard accent="blue" helper="Registered accounts" icon={Activity} label="Users" value={formatNumber(metrics?.totals.users ?? 0)} />
        <StatCard accent="green" helper="Worker profiles" icon={ShieldAlert} label="Workers" value={formatNumber(metrics?.totals.workers ?? 0)} />
        <StatCard accent="amber" helper="Service requests" icon={Workflow} label="Requests" value={formatNumber(metrics?.totals.requests ?? 0)} />
        <StatCard accent="purple" helper="Bookings" icon={HeadphonesIcon} label="Bookings" value={formatNumber(metrics?.totals.bookings ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dependencies</CardTitle>
            <CardDescription>Database, Redis, Typesense, and websocket visibility from the admin health endpoint.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Database", ok: health?.database.ok, detail: `${health?.database.latencyMs ?? 0} ms` },
              { label: "Redis", ok: health?.redis.ok, detail: `${health?.redis.latencyMs ?? 0} ms` },
              {
                label: "Typesense",
                ok: health?.typesense.enabled ? health.typesense.docCount !== null : true,
                detail: health?.typesense.enabled ? `${health.typesense.docCount ?? 0} docs` : "Disabled"
              },
              { label: "Websocket connections", ok: true, detail: `${health?.websocketConnections ?? 0} active` }
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-[1.25rem] border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.detail}</p>
                </div>
                <Badge variant={item.ok ? "green" : "red"}>{item.ok ? "OK" : "DOWN"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent job runs</CardTitle>
            <CardDescription>Background job history from the runtime ledger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(health?.recentJobRuns ?? []).slice(0, 12).map((job) => (
              <div key={job.id} className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{job.jobName}</p>
                    <p className="text-sm text-slate-500">{job.queueName ?? "unknown queue"}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {formatDateTime(job.startedAt)} to {formatDateTime(job.finishedAt ?? null)}
                </p>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-200">{formatJsonValue(job.metadataJson ?? {})}</pre>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { AuditLogsPage, FraudSignalsPage, ModerationCasesPage, ReportsPage, SupportTicketsPage, SystemHealthPage };
