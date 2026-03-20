import { NavLink } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { useCurrentAdmin } from "@/features/auth/auth";
import { hasPermission } from "@/lib/admin-permissions";
import { cn } from "@/lib/utils";
import { navSections } from "@/components/layout/nav-config";

const Sidebar = () => {
  const adminQuery = useCurrentAdmin();
  const roles = adminQuery.data?.roles ?? [];
  const primaryRole = roles[0] ?? "ADMIN";
  const visibleItems = navSections.reduce((total, section) => total + section.items.filter((item) => hasPermission(roles, item.permission)).length, 0);

  return (
    <aside className="hidden h-screen w-[290px] flex-col overflow-y-auto border-r border-white/10 bg-[radial-gradient(circle_at_top,_rgba(36,87,245,0.18),transparent_26%),linear-gradient(180deg,#09101f_0%,#0b1324_36%,#070d18_100%)] px-4 py-5 lg:flex">
      <div className="px-2 pb-6">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-shell backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2457F5,#8FB7FF)] text-lg font-black text-white shadow-lg shadow-blue-950/30">
              V
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-white">
                VSP <span className="text-blue-300">Admin</span>
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Control Center</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Role lane</p>
              <p className="mt-2 text-sm font-bold text-white">{primaryRole.replaceAll("_", " ")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Modules</p>
              <p className="mt-2 text-sm font-bold text-white">{visibleItems}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-2">
          {navSections.map((section) => {
            const items = section.items.filter((item) => hasPermission(roles, item.permission));

            if (items.length === 0) {
              return null;
            }

            return (
              <div key={section.label} className="mb-4 space-y-1 last:mb-0">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{section.label}</p>
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/6 hover:text-white",
                        isActive && "bg-[linear-gradient(135deg,rgba(36,87,245,0.95),rgba(70,110,255,0.85))] text-white shadow-[0_18px_35px_rgba(10,39,117,0.42)]"
                      )
                    }
                    to={item.path}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/6 text-slate-300 transition group-hover:bg-white/10 group-hover:text-white">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span>{item.label}</span>
                    </span>
                    {item.path === "/verification" ? <Badge variant="amber">Queue</Badge> : null}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-auto px-2 pt-6">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Admin policy</p>
          <p className="mt-2 text-sm font-semibold text-white">Super Admin is unrestricted. Admin, Moderator, and Support are front-end and backend permission-gated.</p>
        </div>
      </div>
    </aside>
  );
};

export { Sidebar };
