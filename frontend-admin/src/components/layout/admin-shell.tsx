import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const AdminShell = () => (
  <div className="min-h-screen bg-admin-canvas text-slate-950">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(36,87,245,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.1),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.5),rgba(241,245,249,0.8))]" />
    <div className="flex">
      <Sidebar />
      <div className="relative min-h-screen flex-1">
        <Topbar />
        <main className="px-4 py-5 lg:px-8 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  </div>
);

export { AdminShell };
