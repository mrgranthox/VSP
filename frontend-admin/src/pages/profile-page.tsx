import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  challengeMfa,
  disableMfa,
  getBackupCodes,
  requestMfaSmsCode,
  startMfaSetup,
  updateMyProfile,
  updateNotificationPreferences,
  useCurrentAdmin,
  useMyProfileQuery,
  useNotificationPreferencesQuery,
  verifyMfaSetup
} from "@/features/auth/auth";
import { ApiClientError } from "@/lib/api";
import { useStoredSession } from "@/lib/auth-storage";
import { formatDateTime } from "@/lib/utils";

const ProfilePage = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const session = useStoredSession();
  const adminQuery = useCurrentAdmin();
  const profileQuery = useMyProfileQuery();
  const preferencesQuery = useNotificationPreferencesQuery();
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    bio: ""
  });
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpQr, setTotpQr] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [mfaChallengeMethod, setMfaChallengeMethod] = useState<"totp" | "sms" | "backup_code">("totp");
  const [mfaChallengeCode, setMfaChallengeCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const profile = profileQuery.data;
  const authMe = adminQuery.data;
  const preferences = preferencesQuery.data;
  const isMfaView = location.pathname.endsWith("/mfa");

  useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? ""
      });
    }
  }, [profile]);

  const saveProfileMutation = useMutation({
    mutationFn: () => updateMyProfile(profileForm),
    onSuccess: async () => {
      toast.success("Profile updated");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
      ]);
    },
    onError: () => toast.error("Unable to update profile")
  });

  const savePreferencesMutation = useMutation({
    mutationFn: () =>
      updateNotificationPreferences({
        marketingEmailEnabled: !preferences?.marketingEmailEnabled,
        quietHoursStart: preferences?.quietHoursStart ?? 22,
        quietHoursEnd: preferences?.quietHoursEnd ?? 6
      }),
    onSuccess: async () => {
      toast.success("Notification preferences updated");
      await queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
    }
  });

  const totpSetupMutation = useMutation({
    mutationFn: () => startMfaSetup("totp"),
    onSuccess: (data) => {
      setTotpQr(data.qrCodeUrl ?? null);
      setTotpSecret(data.secret ?? null);
      toast.success("TOTP setup started");
    },
    onError: () => toast.error("Unable to start MFA setup")
  });

  const verifyTotpMutation = useMutation({
    mutationFn: () => verifyMfaSetup("totp", totpCode),
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      toast.success("MFA setup verified");
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.code.replaceAll("_", " "));
        return;
      }

      toast.error("Unable to verify MFA setup");
    }
  });

  const stepUpMutation = useMutation({
    mutationFn: () => challengeMfa(mfaChallengeMethod, mfaChallengeCode),
    onSuccess: async () => {
      toast.success("Session elevated for dangerous actions");
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }
  });

  const fetchBackupCodesMutation = useMutation({
    mutationFn: () => getBackupCodes(),
    onSuccess: (data) => setBackupCodes(data.backupCodes)
  });

  const disableMfaMutation = useMutation({
    mutationFn: () => disableMfa("backup_code", backupCodes[0] ?? ""),
    onSuccess: async () => {
      setBackupCodes([]);
      setTotpQr(null);
      setTotpSecret(null);
      toast.success("MFA disabled");
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }
  });

  const profileSettingsCard = (
    <Card>
      <CardHeader>
        <CardTitle>Profile settings</CardTitle>
        <CardDescription>Editable fields from the users module.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">First name</span>
          <Input
            onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))}
            value={profileForm.firstName}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Last name</span>
          <Input
            onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))}
            value={profileForm.lastName}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Display name</span>
          <Input
            onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
            value={profileForm.displayName}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Bio</span>
          <Input onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} value={profileForm.bio} />
        </label>
        <div className="md:col-span-2">
          <Button onClick={() => saveProfileMutation.mutate()}>{saveProfileMutation.isPending ? "Saving..." : "Save changes"}</Button>
        </div>
      </CardContent>
    </Card>
  );

  const notificationPreferencesCard = (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>Preferences are pulled from `/notifications/preferences`.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Marketing email</p>
          <p className="text-sm text-slate-500">
            {preferences?.marketingEmailEnabled ? "Enabled" : "Disabled"} · Quiet hours {preferences?.quietHoursStart ?? 22} to {preferences?.quietHoursEnd ?? 6}
          </p>
        </div>
        <Button onClick={() => savePreferencesMutation.mutate()} variant="outline">
          Toggle marketing email
        </Button>
      </CardContent>
    </Card>
  );

  const mfaCard = (
    <Card>
      <CardHeader>
        <CardTitle>Multi-factor authentication</CardTitle>
        <CardDescription>TOTP setup and session step-up directly against the backend auth endpoints.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-[1.5rem] bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-slate-950">TOTP setup</p>
              <p className="text-sm text-slate-500">Scan the QR or use the secret, then verify with a 6-digit code.</p>
            </div>
          </div>
          <Button data-testid="mfa-start-totp-setup" onClick={() => totpSetupMutation.mutate()} variant="outline">
            Start TOTP setup
          </Button>
          {totpQr ? <img alt="TOTP QR code" className="w-full rounded-2xl border border-slate-200 bg-white p-4" src={totpQr} /> : null}
          {totpSecret ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 font-mono text-xs" data-testid="mfa-totp-secret">
              {totpSecret}
            </div>
          ) : null}
          <Input data-testid="mfa-totp-setup-code" onChange={(event) => setTotpCode(event.target.value)} placeholder="123456" value={totpCode} />
          <Button data-testid="mfa-totp-verify-setup" disabled={totpCode.length < 6} onClick={() => verifyTotpMutation.mutate()}>
            Verify setup
          </Button>
        </div>

        <div className="space-y-4 rounded-[1.5rem] bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-blue-700" />
            <div>
              <p className="font-semibold text-slate-950">Session step-up</p>
              <p className="text-sm text-slate-500">Elevate the current session so dangerous admin actions stop returning MFA_REQUIRED.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-1">
            {[
              ["totp", "TOTP"],
              ["sms", "SMS"],
              ["backup_code", "Backup"]
            ].map(([value, label]) => (
              <button
                key={value}
                data-testid={`mfa-step-up-method-${value}`}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${mfaChallengeMethod === value ? "bg-slate-950 text-white" : "text-slate-500"}`}
                onClick={() => setMfaChallengeMethod(value as "totp" | "sms" | "backup_code")}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            data-testid="mfa-step-up-code"
            onChange={(event) => setMfaChallengeCode(event.target.value)}
            placeholder="Enter code or backup code"
            value={mfaChallengeCode}
          />
          <div className="flex flex-wrap gap-3">
            {mfaChallengeMethod === "sms" ? (
              <Button
                onClick={() =>
                  requestMfaSmsCode()
                    .then(() => toast.success("SMS code sent"))
                    .catch(() => toast.error("Unable to send SMS code"))
                }
                variant="outline"
              >
                <Smartphone className="h-4 w-4" />
                Send SMS
              </Button>
            ) : null}
            <Button data-testid="mfa-step-up-verify" disabled={mfaChallengeCode.length < 6} onClick={() => stepUpMutation.mutate()}>
              Verify session
            </Button>
            <Button onClick={() => fetchBackupCodesMutation.mutate()} variant="ghost">
              Load backup codes
            </Button>
          </div>
          {backupCodes.length > 0 ? (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-950">Backup codes</p>
                <Button onClick={() => disableMfaMutation.mutate()} variant="danger">
                  Disable with first code
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {backupCodes.map((code) => (
                  <div key={code} className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle={
          isMfaView
            ? "Dedicated MFA setup and session elevation lane for dangerous admin operations."
            : "Profile, notification preferences, and MFA controls backed by the real auth and users modules."
        }
        title={isMfaView ? "Admin MFA Setup" : "My Profile"}
      />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Admin identity</CardTitle>
            <CardDescription>Live data from `/auth/me` and `/users/me`.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-[1.5rem] bg-slate-50 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-violet-600 text-xl font-bold text-white">
                {(profile?.displayName ?? authMe?.user.email ?? "AD").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-950">{profile?.displayName || authMe?.user.email}</p>
                <p className="text-sm text-slate-500">{authMe?.user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(authMe?.roles ?? []).map((role) => (
                    <Badge key={role} variant="blue">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                {authMe?.user.email ?? "No email"}
              </div>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-400" />
                Last login: {formatDateTime(authMe?.user.lastLoginAt)}
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400" />
                Session MFA: {session?.decoded.mfa_verified ? "verified" : "not verified"}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {isMfaView ? (
            <>
              {mfaCard}
              {profileSettingsCard}
              {notificationPreferencesCard}
            </>
          ) : (
            <>
              {profileSettingsCard}
              {notificationPreferencesCard}
              {mfaCard}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export { ProfilePage };
