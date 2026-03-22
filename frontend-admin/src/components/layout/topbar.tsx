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
      <div className="flex min-h-[84px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(112,104,84,0.14)] bg-[rgba(255,253,248,0.92)] text-[color:var(--jo-ink)] shadow-sm transition hover:bg-white lg:hidden"
              onClick={onToggleMobileSidebar}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <button
              className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(112,104,84,0.14)] bg-[rgba(255,253,248,0.92)] text-[color:var(--jo-ink)] shadow-sm transition hover:bg-white lg:flex"
              onClick={onToggleDesktopSidebar}
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Current module</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">{pageTitle}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="hidden items-center gap-2 rounded-[1.25rem] border border-[rgba(112,104,84,0.14)] bg-[rgba(255,253,248,0.92)] px-3 py-2 shadow-sm md:flex">
            <ShieldCheck className="h-4 w-4 text-[color:var(--jo-forest)]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Role lane</p>
              <p className="text-sm font-bold text-slate-950">{roles.length > 0 ? roles.join(" · ").replaceAll("_", " ") : "Loading roles"}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-[1.25rem] border border-[rgba(112,104,84,0.14)] bg-[rgba(255,253,248,0.92)] px-3 py-2 shadow-sm xl:flex">
            <Sparkles className="h-4 w-4 text-[color:var(--jo-coral)]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Authority</p>
              <p className="text-sm font-bold text-slate-950">{roles.includes("SUPER_ADMIN") ? "Unrestricted" : roles.length > 0 ? "Policy limited" : "Resolving"}</p>
            </div>
          </div>

          <div className="relative" ref={notificationsPanelRef}>
            <button
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(112,104,84,0.14)] bg-[rgba(255,253,248,0.92)] text-[color:var(--jo-ink)] shadow-sm transition hover:bg-white",
                notificationsOpen && "border-[rgba(65,150,70,0.24)] bg-white"
              )}
              data-testid="topbar-notifications-toggle"
              onClick={() => setNotificationsOpen((current) => !current)}
              title="Open notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <>
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[color:var(--jo-coral)]" />
                  <span className="absolute -right-1 -top-1 flex min-h-[1.2rem] min-w-[1.2rem] items-center justify-center rounded-full bg-[color:var(--jo-coral)] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+0.85rem)] z-30 w-[min(92vw,24rem)] rounded-[1.6rem] border border-[rgba(112,104,84,0.14)] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(250,245,236,0.96))] p-3 shadow-[0_26px_56px_rgba(71,61,45,0.16)]"
                data-testid="topbar-notifications-panel"
              >
                <div className="flex items-start justify-between gap-3 px-2 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:rgba(107,114,102,0.72)]">Notifications</p>
                    <p className="mt-1 text-sm font-bold text-[color:var(--jo-ink)]">{unreadCount} unread in the last pull</p>
                  </div>
                  <button
                    className="text-xs font-semibold text-[color:var(--jo-forest)]"
                    data-testid="topbar-notifications-open-inbox"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate(firstUnread ? `/notifications/${firstUnread}` : "/notifications");
                    }}
                  >
                    Open inbox
                  </button>
                </div>

                <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                  {(notificationsQuery.data?.data ?? []).length === 0 ? (
                    <div className="rounded-[1.25rem] border border-dashed border-[rgba(112,104,84,0.18)] bg-[rgba(255,251,244,0.72)] px-4 py-6 text-center text-sm text-[color:var(--jo-muted)]">
                      No notifications yet.
                    </div>
                  ) : (
                    (notificationsQuery.data?.data ?? []).map((notification) => (
                      <button
                        className={cn(
                          "w-full rounded-[1.25rem] border px-4 py-3 text-left transition",
                          notification.isRead
                            ? "border-[rgba(112,104,84,0.12)] bg-[rgba(255,253,248,0.96)] hover:border-[rgba(65,150,70,0.24)]"
                            : "border-[rgba(246,179,19,0.22)] bg-[rgba(246,179,19,0.08)] hover:border-[rgba(65,150,70,0.24)]"
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
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-[color:var(--jo-ink)]">{notification.notificationType.replaceAll("_", " ")}</p>
                              {!notification.isRead ? <Badge variant="amber">Unread</Badge> : null}
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-[color:var(--jo-muted)]">
                              {Object.entries(notification.payloadJson ?? {})
                                .slice(0, 2)
                                .map(([key, value]) => `${key}: ${String(value)}`)
                                .join(" · ") || "Notification payload recorded."}
                            </p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">
                              {formatRelativeDate(notification.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[color:rgba(107,114,102,0.6)]" />
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 px-1">
                  <button
                    className="inline-flex items-center gap-2 rounded-xl border border-[rgba(112,104,84,0.14)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--jo-ink)] transition hover:border-[rgba(65,150,70,0.24)]"
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
                      className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--jo-forest),var(--jo-gold))] px-3 py-2 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(65,150,70,0.2)]"
                      data-testid="topbar-notifications-broadcast"
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate("/notifications/broadcast");
                      }}
                    >
                      <Megaphone className="h-4 w-4" />
                      Broadcast
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 rounded-[1.4rem] border border-[rgba(112,104,84,0.14)] bg-[rgba(255,253,248,0.94)] px-3 py-2 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--jo-forest),var(--jo-gold),var(--jo-coral))] text-sm font-bold text-white">
              {initials}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-slate-950">{displayName}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{roles.length > 0 ? roles.join(" · ") : "LOADING"}</p>
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(112,104,84,0.14)] text-[color:var(--jo-muted)] transition hover:bg-white"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export { Topbar };
