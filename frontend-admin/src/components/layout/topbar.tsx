import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronRight, Lock, LogOut, Megaphone, PanelLeftClose, PanelLeftOpen, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { useCurrentAdmin, useLogoutAction } from "@/features/auth/auth";
import { useStoredSession } from "@/lib/auth-storage";
import { apiPaginatedRequest } from "@/lib/api";
import { hasPermission } from "@/lib/admin-permissions";
import { resolvePageTitle } from "@/components/layout/nav-config";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { NotificationItem } from "@/types/admin";

interface TopbarProps {
  isSidebarCollapsed: boolean;
  onToggleDesktopSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

const Topbar = ({ isSidebarCollapsed, onToggleDesktopSidebar, onToggleMobileSidebar }: TopbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const adminQuery = useCurrentAdmin();
  const session = useStoredSession();
  const logoutMutation = useLogoutAction();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const pageTitle = resolvePageTitle(location.pathname);
  const displayName = adminQuery.data?.user.email ?? "Loading profile";
  const initials = displayName
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase() || "AD";
  const roles = adminQuery.data?.roles ?? session?.decoded.roles ?? [];
  const notificationsQuery = useQuery({
    queryKey: ["topbar", "notifications"],
    queryFn: () => apiPaginatedRequest<NotificationItem>("/notifications?page=1&limit=6"),
    refetchInterval: 30_000
  });
  const unreadCount = notificationsQuery.data?.meta.unreadCount ?? 0;
  const firstUnread = notificationsQuery.data?.data.find((item) => !item.isRead)?.id ?? notificationsQuery.data?.data[0]?.id;
  const canBroadcast = hasPermission(roles, "NOTIFICATION_BROADCAST");

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationsPanelRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [notificationsOpen]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname]);

  return (
    <header className="admin-topbar-shell sticky top-0 z-20 border-b backdrop-blur-xl">
      <div className="flex min-h-[80px] flex-wrap items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-label="Open mobile navigation"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50 lg:hidden"
              onClick={onToggleMobileSidebar}
              type="button"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <button
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50 lg:flex"
              onClick={onToggleDesktopSidebar}
              type="button"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <Badge variant="green">Admin workspace</Badge>
            <Badge variant={session?.decoded.mfa_verified ? "green" : "amber"}>
              <Lock className="h-3.5 w-3.5" />
              {session?.decoded.mfa_verified ? "MFA verified" : "MFA pending"}
            </Badge>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current module</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{pageTitle}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm md:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Role lane</p>
              <p className="text-sm font-bold text-slate-900">{roles.length > 0 ? roles.join(" · ").replaceAll("_", " ") : "Loading roles"}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm xl:flex">
            <Sparkles className="h-4 w-4 text-sky-600" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Authority</p>
              <p className="text-sm font-bold text-slate-900">{roles.includes("SUPER_ADMIN") ? "Unrestricted" : roles.length > 0 ? "Policy limited" : "Resolving"}</p>
            </div>
          </div>

          <div className="relative" ref={notificationsPanelRef}>
            <button
              aria-expanded={notificationsOpen}
              aria-label="Open notifications"
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50",
                notificationsOpen && "border-sky-500 ring-2 ring-sky-500/20"
              )}
              data-testid="topbar-notifications-toggle"
              onClick={() => setNotificationsOpen((current) => !current)}
              type="button"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <>
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                  <span className="absolute -right-1 -top-1 flex min-h-[1.2rem] min-w-[1.2rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(92vw,24rem)] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl"
                data-testid="topbar-notifications-panel"
              >
                <div className="flex items-start justify-between gap-3 px-2 pb-3 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Notifications</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{unreadCount} unread in the last pull</p>
                  </div>
                  <button
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                    data-testid="topbar-notifications-open-inbox"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate(firstUnread ? `/notifications/${firstUnread}` : "/notifications");
                    }}
                  >
                    Open inbox
                  </button>
                </div>

                <div className="max-h-[22rem] space-y-2 overflow-y-auto py-2 pr-1">
                  {(notificationsQuery.data?.data ?? []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    (notificationsQuery.data?.data ?? []).map((notification) => (
                      <button
                        className={cn(
                          "w-full rounded-xl border px-3.5 py-2.5 text-left transition",
                          notification.isRead
                            ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            : "border-amber-200 bg-amber-50/60 hover:border-amber-300"
                        )}
                        data-testid={`topbar-notification-item-${notification.id}`}
                        key={notification.id}
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate(`/notifications/${notification.id}`);
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-bold text-slate-900">{notification.notificationType.replaceAll("_", " ")}</p>
                              {!notification.isRead ? <Badge variant="amber">Unread</Badge> : null}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600 leading-relaxed">
                              {Object.entries(notification.payloadJson ?? {})
                                .slice(0, 2)
                                .map(([key, value]) => `${key}: ${String(value)}`)
                                .join(" · ") || "Notification payload recorded."}
                            </p>
                            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {formatRelativeDate(notification.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-3 px-1">
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 hover:border-slate-300"
                    data-testid="topbar-notifications-center"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate("/notifications");
                    }}
                  >
                    Notification center
                  </button>
                  {canBroadcast ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                      data-testid="topbar-notifications-broadcast"
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate("/notifications/broadcast");
                      }}
                    >
                      <Megaphone className="h-3.5 w-3.5" />
                      Broadcast
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white shadow-sm">
              {initials}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{roles.length > 0 ? roles.join(" · ") : "LOADING"}</p>
            </div>
            <button
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              onClick={() => logoutMutation.mutate()}
              type="button"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export { Topbar };
