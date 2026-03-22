import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authKeys, challengeMfa, login, requestMfaSmsCode } from "@/features/auth/auth";
import { ApiClientError, apiRequest } from "@/lib/api";
import { getStoredSession } from "@/lib/auth-storage";
import type { AuthMeResponse } from "@/types/auth";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<"totp" | "sms" | "backup_code">("totp");
  const [mfaCode, setMfaCode] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const nextPath = (location.state as { from?: string } | null)?.from ?? "/overview";

  const loginMutation = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: async () => {
      const me = await apiRequest<AuthMeResponse>("/auth/me");
      queryClient.setQueryData(authKeys.me, me);

      if ((me?.roles.length ?? 0) === 0) {
        navigate("/access-denied", { replace: true });
        return;
      }

      if (getStoredSession()?.decoded.mfa_verified === false) {
        setShowMfaModal(true);
        return;
      }

      navigate(nextPath, { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.code.replaceAll("_", " "));
        return;
      }

      toast.error("Unable to sign in");
    }
  });

  const mfaMutation = useMutation({
    mutationFn: () => challengeMfa(mfaMethod, mfaCode),
    onSuccess: () => {
      toast.success("MFA challenge completed");
      setShowMfaModal(false);
      navigate(nextPath, { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.code.replaceAll("_", " "));
        return;
      }

      toast.error("MFA verification failed");
    }
  });

  const isPending = loginMutation.isPending || mfaMutation.isPending;
  const helperLabel = useMemo(
    () => (mfaMethod === "sms" ? "Send SMS code first if you need one." : "Use TOTP, SMS, or a backup code from your admin account."),
    [mfaMethod]
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <div className="hidden bg-gradient-to-br from-[#0A0F1E] via-[#101B36] to-[#1E3A8A] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-300">Vocational Services Platform</p>
          <h1 className="mt-6 max-w-lg text-5xl font-extrabold tracking-tight">Admin control plane for the marketplace.</h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Review workers, triage moderation, monitor bookings, and keep the platform healthy from one React-based console.
          </p>
        </div>

        <div className="grid gap-4">
          {[
            "Role-aware admin access backed by the live auth service",
            "MFA-aware sessions for dangerous operations",
            "Notifications, audit trails, fraud signals, and runtime health from the database"
          ].map((item) => (
            <div key={item} className="glass-panel flex items-start gap-3 rounded-[1.5rem] px-5 py-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-300" />
              <span className="text-sm text-slate-200">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-4 py-10">
        <Card className="w-full max-w-xl rounded-[2rem]">
          <CardHeader className="pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">Secure admin access</p>
            <CardTitle className="text-3xl font-extrabold">Welcome back</CardTitle>
            <CardDescription>Sign in with a real admin account provisioned in the platform database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-11" onChange={(event) => setEmail(event.target.value)} value={email} />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-11" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
              </div>
            </label>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Database-backed admin access</p>
              <p className="mt-2 leading-6">
                Sign in with a real admin, moderator, support, or super-admin account provisioned in the platform database.
              </p>
            </div>

            <Button className="w-full" disabled={isPending} onClick={() => loginMutation.mutate()}>
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Link className="font-semibold text-blue-700" to="/password-reset">
                Forgot password?
              </Link>
              <span className="text-slate-400">Protected admin access only</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {showMfaModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <Card className="w-full max-w-md rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Admin MFA step-up</CardTitle>
              <CardDescription>
                This session is active, but dangerous admin actions still require MFA verification. {helperLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-1">
                {[
                  ["totp", "TOTP"],
                  ["sms", "SMS"],
                  ["backup_code", "Backup"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      mfaMethod === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                    }`}
                    onClick={() => setMfaMethod(value as "totp" | "sms" | "backup_code")}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Input onChange={(event) => setMfaCode(event.target.value)} placeholder="Enter your code" value={mfaCode} />

              <div className="flex gap-3">
                {mfaMethod === "sms" ? (
                  <Button
                    className="flex-1"
                    onClick={() =>
                      requestMfaSmsCode()
                        .then(() => toast.success("SMS code sent"))
                        .catch((error) => {
                          if (error instanceof ApiClientError) {
                            toast.error(error.code.replaceAll("_", " "));
                            return;
                          }

                          toast.error("Unable to send SMS code");
                        })
                    }
                    variant="outline"
                  >
                    <Smartphone className="h-4 w-4" />
                    Send code
                  </Button>
                ) : null}
                <Button className="flex-1" disabled={mfaCode.trim().length < 6} onClick={() => mfaMutation.mutate()}>
                  Verify now
                </Button>
              </div>

              <div className="flex justify-between text-sm">
                <Link className="font-semibold text-blue-700" to="/profile">
                  Set up MFA instead
                </Link>
                <button
                  className="font-semibold text-slate-500"
                  onClick={() => {
                    setShowMfaModal(false);
                    navigate(nextPath, { replace: true });
                  }}
                >
                  Continue for now
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export { LoginPage };
