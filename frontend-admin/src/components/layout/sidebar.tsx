import { X } from "lucide-react";
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
        aria-hidden={!mobileOpen}
        className={cn("fixed inset-0 z-30 bg-slate-950/42 backdrop-blur-[2px] transition lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={onClose}
      />

      <aside
        className={cn(
          "admin-sidebar-panel fixed inset-y-0 left-0 z-40 flex h-screen w-[308px] shrink-0 flex-col border-r border-white/10 transition-all duration-300 ease-out lg:sticky lg:top-0 lg:z-10",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[94px]" : "lg:w-[308px]"
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col px-4 py-5">
          <div className="px-2 pb-5">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-shell backdrop-blur">
              <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--jo-forest),var(--jo-gold))] text-lg font-black text-white shadow-lg shadow-black/20">
                  V
                </div>
                <div className={cn("min-w-0 transition-all duration-200", collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100")}>
                  <p className="text-lg font-black tracking-tight text-white">
                    VSP <span className="text-[color:var(--jo-gold)]">Admin</span>
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:rgba(255,248,235,0.52)]">Jungle Opal Morning</p>
                </div>
                <button
                  className="ml-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className={cn("mt-5 grid gap-3 transition-all duration-200", collapsed ? "grid-cols-1" : "sm:grid-cols-2")}>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(255,248,235,0.46)]">{collapsed ? "Role" : "Role lane"}</p>
                  <p className={cn("mt-2 font-bold text-white", collapsed ? "text-xs" : "text-sm")}>{collapsed ? primaryRole.slice(0, 5) : primaryRole.replaceAll("_", " ")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgba(255,248,235,0.46)]">{collapsed ? "Items" : "Modules"}</p>
                  <p className="mt-2 text-sm font-bold text-white">{visibleItems}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            <div className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-2">
              {navSections.map((section) => {
                const items = section.items.filter((item) => hasPermission(roles, item.permission));

                if (items.length === 0) {
                  return null;
                }

                return (
                  <div key={section.label} className="mb-4 space-y-1 last:mb-0">
                    <p className={cn("pb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[color:rgba(255,248,235,0.42)]", collapsed ? "px-0 text-center" : "px-3")}>
                      {collapsed ? section.label.slice(0, 3) : section.label}
                    </p>
                    {items.map((item) => (
                      <NavLink
                        key={item.path}
                        className={({ isActive }) =>
                          cn(
                            "group flex items-center rounded-2xl text-sm font-medium text-[color:rgba(255,248,235,0.72)] transition hover:bg-white/8 hover:text-white",
                            collapsed ? "justify-center px-0 py-3" : "justify-between px-3 py-3",
                            isActive && "bg-[linear-gradient(135deg,rgba(65,150,70,0.96),rgba(246,179,19,0.88),rgba(255,75,25,0.84))] text-white shadow-[0_18px_35px_rgba(23,51,40,0.28)]"
                          )
                        }
                        title={item.label}
                        to={item.path}
                      >
                        <span className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-[color:rgba(255,248,235,0.84)] transition group-hover:bg-white/12 group-hover:text-white">
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

          <div className="mt-auto px-2 pt-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:rgba(255,248,235,0.46)]">{collapsed ? "Policy" : "Admin policy"}</p>
              <p className={cn("mt-2 font-semibold text-white transition-all duration-200", collapsed ? "text-xs leading-5" : "text-sm")}>
                {collapsed ? "Role-gated" : "Super Admin is unrestricted. Admin, Moderator, and Support are front-end and backend permission-gated."}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export { Sidebar };
