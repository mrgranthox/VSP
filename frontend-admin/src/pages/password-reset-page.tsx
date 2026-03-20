import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, resetPassword } from "@/features/auth/auth";
import { ApiClientError } from "@/lib/api";

const PasswordResetPage = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const requestMutation = useMutation({
    mutationFn: () => requestPasswordReset(email),
    onSuccess: () => {
      toast.success("Reset request submitted");
      setStep(2);
    },
    onError: () => toast.error("Unable to start reset flow")
  });

  const resetMutation = useMutation({
    mutationFn: () => resetPassword(token, newPassword),
    onSuccess: () => {
      toast.success("Password reset complete");
      setStep(3);
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.code.replaceAll("_", " "));
        return;
      }

      toast.error("Unable to reset password");
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A0F1E] via-[#111827] to-[#1E293B] px-4 py-12">
      <Card className="w-full max-w-xl rounded-[2rem]">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Admin recovery</p>
          <CardTitle>Password reset</CardTitle>
          <CardDescription>This backend uses reset tokens. Request the reset, then paste the token you received to complete the flow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-1">
            {["Request", "Token", "Done"].map((label, index) => (
              <div
                key={label}
                className={`rounded-xl px-3 py-2 text-center text-sm font-semibold ${
                  step === index + 1 ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Admin email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-11" onChange={(event) => setEmail(event.target.value)} value={email} />
                </div>
              </label>
              <Button className="w-full" disabled={!email || requestMutation.isPending} onClick={() => requestMutation.mutate()}>
                {requestMutation.isPending ? "Sending..." : "Send reset token"}
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Reset token</span>
                <Input onChange={(event) => setToken(event.target.value)} placeholder="Paste the reset token" value={token} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">New password</span>
                <Input onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Confirm password</span>
                <Input onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
              </label>
              <Button
                className="w-full"
                disabled={!token || newPassword.length < 8 || newPassword !== confirmPassword || resetMutation.isPending}
                onClick={() => resetMutation.mutate()}
              >
                {resetMutation.isPending ? "Resetting..." : "Reset password"}
              </Button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="rounded-[1.5rem] bg-emerald-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <h3 className="mt-4 text-xl font-bold text-slate-950">Password updated</h3>
              <p className="mt-2 text-sm text-slate-600">You can head back to the admin login screen and use the new password immediately.</p>
              <Link className="mt-5 inline-flex" to="/login">
                <Button>Return to login</Button>
              </Link>
            </div>
          ) : null}

          <div className="flex justify-between text-sm">
            <Link className="font-semibold text-blue-700" to="/login">
              Back to sign in
            </Link>
            <span className="inline-flex items-center gap-2 text-slate-400">
              <KeyRound className="h-4 w-4" />
              Token-based reset flow
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { PasswordResetPage };
