import { ShieldCheck, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { navSections } from "@/components/layout/nav-config";
import { useCurrentAdmin } from "@/features/auth/auth";
import { hasPermission } from "@/lib/admin-permissions";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ collapsed, mobileOpen, onClose }: SidebarProps) => {
  const adminQuery = useCurrentAdmin();
  const roles = adminQuery.data?.roles ?? [];
  const primaryRole = roles[0] ?? "ADMIN";
  const visibleItems = navSections.reduce((total, section) => total + section.items.filter((item) => hasPermission(roles, item.permission)).length, 0);

  return (
    <>
      <button
        aria-label="Close mobile navigation overlay"
        aria-hidden={!mobileOpen}
        className={cn("fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm transition lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={onClose}
        type="button"
      />

      <aside
        className={cn(
          "admin-sidebar-panel fixed inset-y-0 left-0 z-40 flex h-screen w-[308px] shrink-0 flex-col border-r border-slate-800 transition-all duration-300 ease-out lg:sticky lg:top-0 lg:z-10",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[96px]" : "lg:w-[308px]"
        )}
      >
        <div className={cn("flex min-h-0 flex-1 flex-col py-5", collapsed ? "px-2" : "px-4")}>
          <div className={cn("pb-5", collapsed ? "px-0" : "px-2")}>
            <div className={cn("rounded-2xl border border-slate-700/60 bg-slate-900/60 shadow-md backdrop-blur", collapsed ? "p-2.5" : "p-4")}>
              <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                <div className={cn("flex shrink-0 items-center justify-center rounded-xl bg-sky-600 text-lg font-black text-white shadow-md shadow-sky-950/40", collapsed ? "h-11 w-11" : "h-12 w-12")}>
                  V
                </div>
                <div className={cn("min-w-0 transition-all duration-200", collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100")}>
                  <p className="text-lg font-black tracking-tight text-white">
                    VSP <span className="text-sky-400">Admin</span>
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Operations Portal</p>
                </div>
                <button
                  aria-label="Close mobile navigation"
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-white lg:hidden"
                  onClick={onClose}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {collapsed ? (
                <div className="mt-3 flex justify-center">
                  <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/80 text-white" title={primaryRole.replaceAll("_", " ")}>
                    <ShieldCheck className="h-4 w-4 text-sky-400" />
                    <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300">
                      {primaryRole[0]}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role lane</p>
                    <p className="mt-1 text-sm font-bold text-white">{primaryRole.replaceAll("_", " ")}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modules</p>
                    <p className="mt-1 text-sm font-bold text-white">{visibleItems}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={cn("admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto pb-4", collapsed ? "px-0" : "px-2")}>
            <div className={cn("space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/40", collapsed ? "p-1.5" : "p-2")}>
              {navSections.map((section) => {
                const items = section.items.filter((item) => hasPermission(roles, item.permission));

                if (items.length === 0) {
                  return null;
                }

                return (
                  <div key={section.label} className="mb-3 space-y-1 last:mb-0">
                    {collapsed ? (
                      <div className="flex justify-center pb-1">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {section.label.slice(0, 1)}
                        </span>
                      </div>
                    ) : (
                      <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{section.label}</p>
                    )}
                    {items.map((item) => (
                      <NavLink
                        aria-label={collapsed ? item.label : undefined}
                        key={item.path}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center rounded-xl text-sm font-medium transition",
                            collapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2.5",
                            isActive
                              ? "bg-sky-600 font-semibold text-white shadow-md shadow-sky-950/40"
                              : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                          )
                        }
                        title={item.label}
                        to={item.path}
                      >
                        <span className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                          <span
                            className={cn(
                              "flex shrink-0 items-center justify-center rounded-lg transition",
                              collapsed ? "h-10 w-10" : "h-8 w-8",
                              "text-slate-300 group-hover:text-white"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                          </span>
                          <span className={cn("min-w-0 transition-all duration-200", collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100")}>{item.label}</span>
                        </span>
                        {!collapsed && item.path === "/verification" ? <Badge variant="amber">Queue</Badge> : null}
                      </NavLink>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={cn("mt-auto pt-3", collapsed ? "px-0" : "px-2")}>
            {collapsed ? (
              <div className="flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-white" title="Role gated workspace">
                  <ShieldCheck className="h-4 w-4 text-sky-400" />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin policy</p>
                <p className="mt-1.5 text-xs font-medium text-slate-300 leading-relaxed">
                  Super Admin is unrestricted. Admin, Moderator, and Support are permission-gated.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export { Sidebar };
