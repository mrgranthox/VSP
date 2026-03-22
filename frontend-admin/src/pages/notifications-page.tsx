import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellDot, CheckCheck, ChevronRight, Megaphone, MessageCircleMore, ShieldAlert, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { PaginationControls } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/layout/page-header";
import { useCurrentAdmin } from "@/features/auth/auth";
import { hasPermission } from "@/lib/admin-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiPaginatedRequest, apiRequest, getApiErrorMessage, isMfaRequiredError } from "@/lib/api";
import { cn, formatDateTime, formatJsonValue, formatRelativeDate } from "@/lib/utils";
import type { NotificationItem } from "@/types/admin";

const iconMap = {
  NEW_MESSAGE: MessageCircleMore,
  REQUEST_ASSIGNED: Wrench,
  ADMIN_BROADCAST: Megaphone,
  FRAUD_SIGNAL_TRIGGERED: ShieldAlert
} as const;

const variantMap = {
  NEW_MESSAGE: "blue",
  REQUEST_ASSIGNED: "amber",
  ADMIN_BROADCAST: "purple",
  FRAUD_SIGNAL_TRIGGERED: "red"
} as const;

const notificationIconClasses = {
  blue: "bg-[rgba(65,150,70,0.12)] text-[color:var(--jo-forest)]",
  amber: "bg-[rgba(246,179,19,0.18)] text-[#9a6a00]",
  purple: "bg-[rgba(233,119,155,0.16)] text-[color:var(--jo-rose)]",
  red: "bg-[rgba(255,75,25,0.14)] text-[color:var(--jo-coral)]"
} as const;

const readString = (payload: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
};

const resolveNotificationActionLinks = (notification: NotificationItem) => {
  const payload = notification.payloadJson ?? {};
  const links: Array<{ label: string; to: string }> = [];
  const bookingId = readString(payload, "bookingId");
  const requestId = readString(payload, "requestId", "serviceRequestId");
  const workerId = readString(payload, "workerProfileId", "workerId");
  const userId = readString(payload, "userId");
  const postId = readString(payload, "postId");
  const commentId = readString(payload, "commentId");
  const reviewId = readString(payload, "reviewId");
  const reportId = readString(payload, "reportId");

  if (bookingId) {
    links.push({ label: "Open booking", to: `/bookings/${bookingId}` });
  }

  if (requestId) {
    links.push({ label: "Open request", to: `/service-requests/${requestId}` });
  }

  if (workerId) {
    links.push({ label: "Open worker", to: `/workers/${workerId}` });
  }

  if (userId) {
    links.push({ label: "Open user", to: `/users/${userId}` });
  }

  if (postId) {
    links.push({ label: "Open post", to: `/content/post/${postId}` });
  }

  if (commentId) {
    links.push({ label: "Open comment", to: `/content/comment/${commentId}` });
  }

  if (reviewId) {
    links.push({ label: "Open review", to: `/content/review/${reviewId}` });
  }

  if (reportId) {
    links.push({ label: "Open report", to: `/reports/${reportId}` });
  }

  return links;
};

const getNotificationSummary = (notification: NotificationItem) =>
  Object.entries(notification.payloadJson ?? {})
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");

const NotificationsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notificationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [broadcastForm, setBroadcastForm] = useState({
    targetAudience: "ALL_USERS",
    targetId: "",
    title: "",
    body: "",
    channel: "IN_APP"
  });
  const queryClient = useQueryClient();
  const adminQuery = useCurrentAdmin();
  const unreadOnly = searchParams.get("unread") === "true";
  const currentPage = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const updateSearchState = (updates: { page?: number; unreadOnly?: boolean }) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (updates.page !== undefined) {
      nextSearchParams.set("page", String(Math.max(1, updates.page)));
    }

    if (updates.unreadOnly !== undefined) {
      if (updates.unreadOnly) {
        nextSearchParams.set("unread", "true");
      } else {
        nextSearchParams.delete("unread");
      }
    }

    setSearchParams(nextSearchParams, { replace: true });
  };

  const notificationsQuery = useQuery({
    queryKey: ["notifications", currentPage, unreadOnly],
    queryFn: () => apiPaginatedRequest<NotificationItem>(`/notifications?page=${currentPage}&limit=20${unreadOnly ? "&isRead=false" : ""}`)
  });

  const notificationDetailQuery = useQuery({
    queryKey: ["notifications", "detail", notificationId],
    queryFn: () => apiRequest<NotificationItem>(`/notifications/${notificationId}`),
    enabled: Boolean(notificationId)
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest<{ updatedCount: number }>("/notifications/read-all", { method: "POST", body: {} }),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<NotificationItem>(`/notifications/${id}/read`, {
        method: "POST",
        body: {}
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: () =>
      apiRequest("/admin/notifications/broadcast", {
        method: "POST",
        body: {
          ...broadcastForm,
          ...(broadcastForm.targetAudience === "CITY" || broadcastForm.targetAudience === "TRADE"
            ? { targetId: broadcastForm.targetId }
            : {})
        }
      }),
    onSuccess: () => {
      toast.success("Broadcast queued");
      setBroadcastForm({
        targetAudience: "ALL_USERS",
        targetId: "",
        title: "",
        body: "",
        channel: "IN_APP"
      });
    },
    onError: (error) => {
      if (isMfaRequiredError(error)) {
        toast.error("Verify MFA in My Profile before sending broadcasts");
        return;
      }

      toast.error(getApiErrorMessage(error, "Unable to send broadcast"));
    }
  });

  const notifications = notificationsQuery.data?.data ?? [];
  const unreadCount = notificationsQuery.data?.meta.unreadCount ?? 0;
  const roles = adminQuery.data?.roles ?? [];
  const canBroadcast = hasPermission(roles, "NOTIFICATION_BROADCAST");
  const isBroadcastRoute = location.pathname.endsWith("/broadcast");
  const selectedNotification = notificationDetailQuery.data ?? notifications.find((item) => item.id === notificationId) ?? null;
  const selectedNotificationIndex = notificationId ? notifications.findIndex((item) => item.id === notificationId) : -1;

  const groupedTypes = useMemo(() => {
    const counts = new Map<string, number>();

    notifications.forEach((item) => {
      counts.set(item.notificationType, (counts.get(item.notificationType) ?? 0) + 1);
    });

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [notifications]);

  const handleOpenNotification = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Unable to update notification"));
      }
    }

    navigate({
      pathname: `/notifications/${notification.id}`,
      search: `?${searchParams.toString()}`
    });
  };

  const broadcastCard = canBroadcast ? (
    <Card>
      <CardHeader>
        <CardTitle>{isBroadcastRoute ? "Broadcast composer" : "Broadcast notification"}</CardTitle>
        <CardDescription>Send in-app, push, or email broadcasts through the admin notifications endpoint.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Audience</span>
            <Select
              aria-label="Broadcast audience"
              onChange={(event) => setBroadcastForm((current) => ({ ...current, targetAudience: event.target.value }))}
              value={broadcastForm.targetAudience}
            >
              <option value="ALL_USERS">All users</option>
              <option value="ALL_WORKERS">All workers</option>
              <option value="CITY">City audience</option>
              <option value="TRADE">Trade audience</option>
            </Select>
          </label>
          {broadcastForm.targetAudience === "CITY" || broadcastForm.targetAudience === "TRADE" ? (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Target audience ID</span>
              <Input
                aria-label="Broadcast target audience identifier"
                onChange={(event) => setBroadcastForm((current) => ({ ...current, targetId: event.target.value }))}
                placeholder="City or trade UUID"
                value={broadcastForm.targetId}
              />
            </label>
          ) : null}
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Channel</span>
            <Select
              aria-label="Broadcast delivery channel"
              onChange={(event) => setBroadcastForm((current) => ({ ...current, channel: event.target.value }))}
              value={broadcastForm.channel}
            >
              <option value="IN_APP">In-app</option>
              <option value="PUSH">Push</option>
              <option value="EMAIL">Email</option>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Title</span>
            <Input
              aria-label="Broadcast title"
              onChange={(event) => setBroadcastForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Broadcast title"
              value={broadcastForm.title}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Message</span>
            <Textarea
              aria-label="Broadcast message"
              onChange={(event) => setBroadcastForm((current) => ({ ...current, body: event.target.value }))}
              placeholder="What do admins need users to know?"
              value={broadcastForm.body}
            />
          </label>
        </div>

        <Button
          disabled={broadcastForm.title.trim().length < 5 || broadcastForm.body.trim().length < 10 || broadcastMutation.isPending}
          onClick={() => broadcastMutation.mutate()}
        >
          <Megaphone className="h-4 w-4" />
          {broadcastMutation.isPending ? "Sending..." : "Send broadcast"}
        </Button>
      </CardContent>
    </Card>
  ) : null;

  const actionLinks = selectedNotification ? resolveNotificationActionLinks(selectedNotification) : [];

  return (
    <div className="space-y-6" data-testid="notifications-page">
      <PageHeader
        subtitle={
          isBroadcastRoute
            ? "Audience selection, channel choice, and durable delivery are routed through the backend admin notifications endpoint."
            : notificationId
              ? "Notification detail desk with payload evidence, read-state controls, and contextual jump links."
              : "Unread state, payload evidence, and event fan-in are all wired to the backend notifications module."
        }
        title={isBroadcastRoute ? "Broadcast Notification" : notificationId ? "Notification Detail" : "Notifications Center"}
      >
        {!isBroadcastRoute ? (
          <Button data-testid="notifications-mark-all-read" onClick={() => markAllMutation.mutate()} variant="outline">
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        ) : null}
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          {isBroadcastRoute ? broadcastCard : null}

          <Card>
            <CardHeader>
              <CardTitle>Filters & queue stats</CardTitle>
              <CardDescription>Keep the feed focused while you investigate or respond.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[1.35rem] border border-[rgba(112,104,84,0.12)] bg-[linear-gradient(135deg,rgba(65,150,70,0.08),rgba(255,253,248,0.92))] p-4">
                <p className="text-sm font-medium text-[color:var(--jo-muted)]">Unread notifications</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-[color:var(--jo-ink)]">{unreadCount}</p>
              </div>

              <button
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                  unreadOnly
                    ? "border-[rgba(65,150,70,0.24)] bg-[rgba(65,150,70,0.08)] text-[color:var(--jo-forest)]"
                    : "border-[rgba(112,104,84,0.12)] bg-[rgba(255,253,248,0.96)] text-[color:var(--jo-ink)]"
                )}
                data-testid="notifications-unread-filter"
                onClick={() =>
                  updateSearchState({
                    unreadOnly: !unreadOnly,
                    page: 1
                  })
                }
              >
                Unread only
                <span className={`h-3 w-3 rounded-full ${unreadOnly ? "bg-[color:var(--jo-forest)]" : "bg-[color:rgba(107,114,102,0.35)]"}`} />
              </button>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:rgba(107,114,102,0.72)]">Types in current feed</p>
                {groupedTypes.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between rounded-2xl bg-[rgba(255,251,244,0.92)] px-4 py-3">
                    <span className="text-sm font-medium text-[color:var(--jo-ink)]">{type.replaceAll("_", " ")}</span>
                    <Badge variant="blue">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {!isBroadcastRoute ? broadcastCard : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <Card>
            <CardHeader>
              <CardTitle>Notification feed</CardTitle>
              <CardDescription>
                Every row opens a route-backed detail view, keeps feed state in the URL, and supports real queue pagination instead of a fixed first page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.2rem] border border-[rgba(112,104,84,0.12)] bg-[rgba(255,251,244,0.92)] px-4 py-3 text-sm text-[color:var(--jo-muted)]">
                Showing page <span className="font-semibold text-[color:var(--jo-ink)]">{notificationsQuery.data?.pagination.page ?? currentPage}</span>{" "}
                of{" "}
                <span className="font-semibold text-[color:var(--jo-ink)]">
                  {notificationsQuery.data?.pagination ? Math.max(1, Math.ceil(notificationsQuery.data.pagination.total / notificationsQuery.data.pagination.limit)) : 1}
                </span>
              </div>
              {notifications.map((notification) => {
                const Icon = iconMap[notification.notificationType as keyof typeof iconMap] ?? BellDot;
                const variant = variantMap[notification.notificationType as keyof typeof variantMap] ?? "blue";
                const payloadSummary = getNotificationSummary(notification);
                const isSelected = notification.id === notificationId;

                return (
                  <button
                    key={notification.id}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-[1.5rem] border p-4 text-left transition",
                      isSelected
                        ? "border-[rgba(65,150,70,0.24)] bg-[rgba(65,150,70,0.08)]"
                        : notification.isRead
                          ? "border-[rgba(112,104,84,0.12)] bg-[rgba(255,253,248,0.96)] hover:border-[rgba(65,150,70,0.24)]"
                          : "border-[rgba(246,179,19,0.22)] bg-[rgba(246,179,19,0.08)] hover:border-[rgba(65,150,70,0.24)]"
                    )}
                    data-testid={`notification-feed-item-${notification.id}`}
                    onClick={() => void handleOpenNotification(notification)}
                  >
                    <div className={cn("mt-1 flex h-11 w-11 items-center justify-center rounded-2xl", notificationIconClasses[variant])}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[color:var(--jo-ink)]">{notification.notificationType.replaceAll("_", " ")}</p>
                        {!notification.isRead ? <Badge variant="amber">Unread</Badge> : <Badge variant="slate">Read</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--jo-muted)]">{payloadSummary || "Notification payload recorded."}</p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">{formatRelativeDate(notification.createdAt)}</p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[color:rgba(107,114,102,0.6)]" />
                  </button>
                );
              })}
              <PaginationControls onPageChange={(page) => updateSearchState({ page })} pagination={notificationsQuery.data?.pagination} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedNotification ? selectedNotification.notificationType.replaceAll("_", " ") : "Notification detail"}</CardTitle>
              <CardDescription>
                {selectedNotification
                  ? "Inspect payload evidence, read state, and jump straight into the linked admin workflow."
                  : "Select a notification to inspect its payload and related admin actions."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedNotification ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={(variantMap[selectedNotification.notificationType as keyof typeof variantMap] ?? "blue") as "blue" | "green" | "amber" | "red" | "slate" | "purple"}>
                      {selectedNotification.channel ?? "IN_APP"}
                    </Badge>
                    <Badge variant={selectedNotification.isRead ? "slate" : "amber"}>{selectedNotification.isRead ? "Read" : "Unread"}</Badge>
                    <Badge variant="green">{formatRelativeDate(selectedNotification.createdAt)}</Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Created</p>
                      <p className="mt-2 text-sm font-semibold text-[color:var(--jo-ink)]">{formatDateTime(selectedNotification.createdAt)}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-[rgba(112,104,84,0.1)] bg-[rgba(255,251,244,0.92)] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Read at</p>
                      <p className="mt-2 text-sm font-semibold text-[color:var(--jo-ink)]">{formatDateTime(selectedNotification.readAt)}</p>
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-[rgba(112,104,84,0.12)] bg-[rgba(255,253,248,0.96)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Payload summary</p>
                    <p className="mt-3 text-sm leading-7 text-[color:var(--jo-ink)]">{getNotificationSummary(selectedNotification) || "No summary keys were available in this payload."}</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Actions</p>
                    <div className="flex flex-wrap gap-3">
                      {!selectedNotification.isRead ? (
                        <Button data-testid="notification-mark-read" onClick={() => markReadMutation.mutate(selectedNotification.id)} variant="outline">
                          <CheckCheck className="h-4 w-4" />
                          Mark as read
                        </Button>
                      ) : null}
                      <Link className="inline-flex" to={`/notifications?${searchParams.toString()}`}>
                        <Button variant="outline">Back to feed</Button>
                      </Link>
                      {selectedNotificationIndex >= 0 ? (
                        <>
                          <Button
                            disabled={selectedNotificationIndex <= 0}
                            onClick={() => void handleOpenNotification(notifications[selectedNotificationIndex - 1])}
                            variant="outline"
                          >
                            Previous in page
                          </Button>
                          <Button
                            disabled={selectedNotificationIndex >= notifications.length - 1}
                            onClick={() => void handleOpenNotification(notifications[selectedNotificationIndex + 1])}
                            variant="outline"
                          >
                            Next in page
                          </Button>
                        </>
                      ) : null}
                      {selectedNotification.notificationType === "ADMIN_BROADCAST" && canBroadcast ? (
                        <Link className="inline-flex" to="/notifications/broadcast">
                          <Button variant="outline">
                            <Megaphone className="h-4 w-4" />
                            Open broadcast desk
                          </Button>
                        </Link>
                      ) : null}
                      {actionLinks.map((action) => (
                        <Link className="inline-flex" key={`${action.label}-${action.to}`} to={action.to}>
                          <Button variant="primary">
                            {action.label}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:rgba(107,114,102,0.72)]">Payload JSON</p>
                    <pre className="overflow-x-auto rounded-[1.5rem] border border-[rgba(112,104,84,0.12)] bg-[rgba(255,251,244,0.96)] p-4 text-xs leading-6 text-[color:var(--jo-ink)]">
                      {formatJsonValue(selectedNotification.payloadJson)}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-[rgba(112,104,84,0.18)] bg-[rgba(255,251,244,0.72)] px-6 text-center">
                  <div className="space-y-3">
                    <BellDot className="mx-auto h-8 w-8 text-[color:var(--jo-forest)]" />
                    <p className="text-lg font-semibold text-[color:var(--jo-ink)]">Select a notification</p>
                    <p className="max-w-md text-sm text-[color:var(--jo-muted)]">Open a row from the feed to inspect the payload, mark read state, and jump into the related admin surface.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export { NotificationsPage };
