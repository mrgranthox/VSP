import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellDot, CheckCheck, Megaphone, MessageCircleMore, ShieldAlert, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { useCurrentAdmin } from "@/features/auth/auth";
import { hasPermission } from "@/lib/admin-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiPaginatedRequest, apiRequest, getApiErrorMessage, isMfaRequiredError } from "@/lib/api";
import { cn, formatRelativeDate } from "@/lib/utils";
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
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  purple: "bg-violet-50 text-violet-700",
  red: "bg-red-50 text-red-700"
} as const;

const NotificationsPage = () => {
  const location = useLocation();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    targetAudience: "ALL_USERS",
    targetId: "",
    title: "",
    body: "",
    channel: "IN_APP"
  });
  const queryClient = useQueryClient();
  const adminQuery = useCurrentAdmin();

  const notificationsQuery = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => apiPaginatedRequest<NotificationItem>(`/notifications?page=1&limit=20${unreadOnly ? "&isRead=false" : ""}`)
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiRequest<{ updatedCount: number }>("/notifications/read-all", { method: "POST", body: {} }),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest(`/notifications/${notificationId}/read`, {
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

  const groupedTypes = useMemo(() => {
    const counts = new Map<string, number>();

    notifications.forEach((item) => {
      counts.set(item.notificationType, (counts.get(item.notificationType) ?? 0) + 1);
    });

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [notifications]);

  const broadcastCard = canBroadcast ? (
    <Card>
      <CardHeader>
        <CardTitle>{isBroadcastRoute ? "Broadcast composer" : "Broadcast notification"}</CardTitle>
        <CardDescription>Send an in-app, push, or email broadcast with the admin notification endpoint.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <Select
            onChange={(event) => setBroadcastForm((current) => ({ ...current, targetAudience: event.target.value }))}
            value={broadcastForm.targetAudience}
          >
            <option value="ALL_USERS">All users</option>
            <option value="ALL_WORKERS">All workers</option>
            <option value="CITY">City audience</option>
            <option value="TRADE">Trade audience</option>
          </Select>
          {broadcastForm.targetAudience === "CITY" || broadcastForm.targetAudience === "TRADE" ? (
            <Input
              onChange={(event) => setBroadcastForm((current) => ({ ...current, targetId: event.target.value }))}
              placeholder="City or trade UUID"
              value={broadcastForm.targetId}
            />
          ) : null}
          <Select onChange={(event) => setBroadcastForm((current) => ({ ...current, channel: event.target.value }))} value={broadcastForm.channel}>
            <option value="IN_APP">In-app</option>
            <option value="PUSH">Push</option>
            <option value="EMAIL">Email</option>
          </Select>
          <Input
            onChange={(event) => setBroadcastForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Broadcast title"
            value={broadcastForm.title}
          />
          <Textarea
            onChange={(event) => setBroadcastForm((current) => ({ ...current, body: event.target.value }))}
            placeholder="What do admins need users to know?"
            value={broadcastForm.body}
          />
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

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={
          isBroadcastRoute
            ? "Audience selection, channel choice, and broadcast delivery are routed through the backend admin notifications endpoint."
            : "Read state, unread counts, and event fan-in are all wired to the backend notifications module."
        }
        title={isBroadcastRoute ? "Broadcast Notification" : "Notifications Center"}
      >
        <Button onClick={() => markAllMutation.mutate()} variant="outline">
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </Button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <div className="space-y-6">
          {isBroadcastRoute ? broadcastCard : null}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Trim the feed down while you wire the rest of the admin flows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Unread notifications</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{unreadCount}</p>
              </div>

              <button
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                  unreadOnly ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700"
                )}
                onClick={() => setUnreadOnly((value) => !value)}
              >
                Unread only
                <span className={`h-3 w-3 rounded-full ${unreadOnly ? "bg-blue-600" : "bg-slate-300"}`} />
              </button>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Types in current feed</p>
                {groupedTypes.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">{type.replaceAll("_", " ")}</span>
                    <Badge variant="blue">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {!isBroadcastRoute ? broadcastCard : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification feed</CardTitle>
            <CardDescription>Clicking a row marks it as read. Payload summaries are rendered from the durable notification records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.notificationType as keyof typeof iconMap] ?? BellDot;
              const variant = variantMap[notification.notificationType as keyof typeof variantMap] ?? "blue";
              const payloadSummary = Object.entries(notification.payloadJson ?? {})
                .slice(0, 2)
                .map(([key, value]) => `${key}: ${String(value)}`)
                .join(" · ");

              return (
                <button
                  key={notification.id}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-[1.5rem] border p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30",
                    notification.isRead ? "border-slate-200 bg-white" : "border-blue-100 bg-blue-50/50"
                  )}
                  onClick={() => markReadMutation.mutate(notification.id)}
                >
                  <div className={cn("mt-1 flex h-11 w-11 items-center justify-center rounded-2xl", notificationIconClasses[variant])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-950">{notification.notificationType.replaceAll("_", " ")}</p>
                      {!notification.isRead ? <Badge variant="blue">Unread</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{payloadSummary || "Notification payload recorded."}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{formatRelativeDate(notification.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { NotificationsPage };
