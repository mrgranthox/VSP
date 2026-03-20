import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { clearStoredSession, setStoredSession, updateStoredSession, useStoredSession } from "@/lib/auth-storage";
import { ApiClientError, apiRequest } from "@/lib/api";
import type { AuthLoginResponse, AuthMeResponse } from "@/types/auth";
import type { NotificationPreferences, UserProfile } from "@/types/admin";

const authKeys = {
  me: ["auth", "me"] as const,
  profile: ["users", "me"] as const,
  preferences: ["notifications", "preferences"] as const
};

const login = async (input: { email: string; password: string }) => {
  const result = await apiRequest<AuthLoginResponse>("/auth/login", {
    method: "POST",
    auth: false,
    headers: {
      "x-device-type": "web-admin"
    },
    body: input
  });

  setStoredSession({
    accessToken: result.tokenPair.accessToken,
    refreshToken: result.tokenPair.refreshToken,
    expiresAt: result.tokenPair.expiresAt
  });

  return result;
};

const logout = async () => {
  try {
    await apiRequest("/auth/logout", {
      method: "POST",
      body: {}
    });
  } finally {
    clearStoredSession();
  }
};

const requestPasswordReset = (email: string) =>
  apiRequest("/auth/request-password-reset", {
    method: "POST",
    auth: false,
    body: { email }
  });

const resetPassword = (token: string, newPassword: string) =>
  apiRequest("/auth/reset-password", {
    method: "POST",
    auth: false,
    body: {
      token,
      newPassword
    }
  });

const getAuthMe = () => apiRequest<AuthMeResponse>("/auth/me");
const getMyProfile = () => apiRequest<UserProfile>("/users/me");
const updateMyProfile = (payload: Partial<UserProfile>) =>
  apiRequest<UserProfile>("/users/me", {
    method: "PATCH",
    body: payload
  });

const getNotificationPreferences = () => apiRequest<NotificationPreferences>("/notifications/preferences");
const updateNotificationPreferences = (payload: Partial<NotificationPreferences>) =>
  apiRequest<NotificationPreferences>("/notifications/preferences", {
    method: "PATCH",
    body: payload
  });

const startMfaSetup = (method: "totp" | "sms") =>
  apiRequest<{ qrCodeUrl?: string; secret?: string }>("/auth/mfa/setup", {
    method: "POST",
    body: { method }
  });

const verifyMfaSetup = (method: "totp" | "sms", code: string) =>
  apiRequest<{ backupCodes: string[] }>("/auth/mfa/verify-setup", {
    method: "POST",
    body: { method, code }
  });

const requestMfaSmsCode = () =>
  apiRequest("/auth/mfa/challenge/request", {
    method: "POST",
    body: { method: "sms" }
  });

const challengeMfa = async (method: "totp" | "sms" | "backup_code", code: string) => {
  const result = await apiRequest<{ accessToken: string; expiresAt: string; method: string; sessionId: string }>("/auth/mfa/challenge", {
    method: "POST",
    body: { method, code }
  });

  updateStoredSession({
    accessToken: result.accessToken,
    expiresAt: result.expiresAt
  });

  return result;
};

const getBackupCodes = () => apiRequest<{ backupCodes: string[] }>("/auth/mfa/backup-codes");

const disableMfa = (method: "totp" | "sms" | "backup_code", code: string) =>
  apiRequest("/auth/mfa/disable", {
    method: "POST",
    body: { method, code }
  });

const useCurrentAdmin = () => {
  const session = useStoredSession();

  return useQuery({
    queryKey: authKeys.me,
    queryFn: getAuthMe,
    enabled: Boolean(session?.accessToken)
  });
};

const useMyProfileQuery = () => {
  const session = useStoredSession();

  return useQuery({
    queryKey: authKeys.profile,
    queryFn: getMyProfile,
    enabled: Boolean(session?.accessToken)
  });
};

const useNotificationPreferencesQuery = () => {
  const session = useStoredSession();

  return useQuery({
    queryKey: authKeys.preferences,
    queryFn: getNotificationPreferences,
    enabled: Boolean(session?.accessToken)
  });
};

const useLogoutAction = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: async () => {
      await queryClient.clear();
      navigate("/login", { replace: true });
    }
  });
};

const useGuardedErrorToast = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError) {
    toast.error(error.code.replaceAll("_", " "));
    return;
  }

  toast.error(fallback);
};

export {
  authKeys,
  challengeMfa,
  disableMfa,
  getBackupCodes,
  login,
  requestMfaSmsCode,
  requestPasswordReset,
  resetPassword,
  startMfaSetup,
  updateMyProfile,
  updateNotificationPreferences,
  useCurrentAdmin,
  useGuardedErrorToast,
  useLogoutAction,
  useMyProfileQuery,
  useNotificationPreferencesQuery,
  verifyMfaSetup
};
