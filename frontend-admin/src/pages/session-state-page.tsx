import { AlertTriangle, Clock4, ShieldX } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

interface SessionStatePageProps {
  mode: "expired" | "denied";
}

const sessionStates = {
  expired: {
    icon: Clock4,
    title: "Session expired",
    description: "Your admin session timed out. Sign in again and we will bring you back into the console.",
    accent: "text-amber-300",
    secondary: "You can continue once a fresh admin token is restored."
  },
  denied: {
    icon: ShieldX,
    title: "Access denied",
    description: "This account is authenticated, but it does not have admin access for the requested area.",
    accent: "text-red-300",
    secondary: "Use an admin role such as SUPER_ADMIN, ADMIN, MODERATOR, or SUPPORT."
  }
} as const;

const SessionStatePage = ({ mode }: SessionStatePageProps) => {
  const state = sessionStates[mode];
  const Icon = state.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A0F1E] via-[#111827] to-[#1E293B] px-4 py-12">
      <div className="glass-panel max-w-xl rounded-[2rem] p-10 text-white">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ${state.accent}`}>
          <Icon className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{state.title}</h1>
        <p className="mt-3 text-base text-slate-300">{state.description}</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-blue-300" />
            <span>{state.secondary}</span>
          </div>
        </div>
        <div className="mt-8 flex gap-3">
          <Link to="/login">
            <Button>Sign in again</Button>
          </Link>
          <Link to="/overview">
            <Button variant="outline">Go to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export { SessionStatePage };
