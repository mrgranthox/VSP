import { Bell, Lock, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { useCurrentAdmin, useLogoutAction } from "@/features/auth/auth";
import { useStoredSession } from "@/lib/auth-storage";
import { resolvePageTitle } from "@/components/layout/nav-config";

const Topbar = () => {
  const location = useLocation();
  const adminQuery = useCurrentAdmin();
  const session = useStoredSession();
  const logoutMutation = useLogoutAction();
  const pageTitle = resolvePageTitle(location.pathname);
  const displayName = adminQuery.data?.user.email ?? "Admin User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const roles = adminQuery.data?.roles ?? ["ADMIN"];

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="flex min-h-[84px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="blue">Admin workspace</Badge>
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
          <div className="hidden items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white/90 px-3 py-2 shadow-sm md:flex">
            <ShieldCheck className="h-4 w-4 text-blue-700" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Role lane</p>
              <p className="text-sm font-bold text-slate-950">{roles.join(" · ").replaceAll("_", " ")}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-[1.25rem] border border-slate-200 bg-white/90 px-3 py-2 shadow-sm xl:flex">
            <Sparkles className="h-4 w-4 text-violet-700" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Authority</p>
              <p className="text-sm font-bold text-slate-950">{roles.includes("SUPER_ADMIN") ? "Unrestricted" : "Policy limited"}</p>
            </div>
          </div>

          <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <div className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-white/95 px-3 py-2 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-violet-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-slate-950">{displayName}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{roles.join(" · ")}</p>
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
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
