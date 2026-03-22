import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const SIDEBAR_PREF_KEY = "vsp.admin.sidebar.collapsed";

const getInitialCollapsedState = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_PREF_KEY) === "1";
};

const AdminShell = () => {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getInitialCollapsedState);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_PREF_KEY, isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen overflow-x-clip bg-admin-canvas text-[color:var(--jo-ink)]">
      <div className="admin-canvas-overlay pointer-events-none fixed inset-0" />
      <div className="relative flex min-h-screen items-start">
        <Sidebar collapsed={isSidebarCollapsed} mobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
        <div className="relative min-h-screen min-w-0 flex-1">
          <Topbar
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleDesktopSidebar={() => setIsSidebarCollapsed((current) => !current)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((current) => !current)}
          />
          <main className="px-4 pb-8 pt-4 sm:px-5 lg:px-8 lg:pb-10 lg:pt-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export { AdminShell };
