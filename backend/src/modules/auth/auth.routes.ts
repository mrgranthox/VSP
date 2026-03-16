import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { requireMfa } from "../../middleware/requireMfa";
import { rateLimit } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { authController } from "./auth.controller";
import {
  LoginBody,
  LogoutBody,
  MFAChallengeBody,
  MFAChallengeRequestBody,
  MFADisableBody,
  MFASetupBody,
  MFAVerifyBody,
  RefreshBody,
  RegisterBody,
  RequestPasswordResetBody,
  ResetPasswordBody,
  RevokeSessionBody,
  VerifyEmailBody,
  VerifyPhoneBody,
} from "./auth.schemas";

const authRoutes = Router();

authRoutes.post(
  "/register",
  rateLimit((req) => `register:${req.ip}`, 60 * 60 * 1000, 3),
  validate(RegisterBody),
  authController.register,
);

authRoutes.post(
  "/login",
  rateLimit(
    (req) =>
      `login:${req.ip}:${req.get("x-device-type") ?? req.get("x-device") ?? "unknown"}`,
    5 * 60 * 1000,
    5,
  ),
  validate(LoginBody),
  authController.login,
);

authRoutes.post(
  "/logout",
  authenticate,
  validate(LogoutBody),
  authController.logout,
);
authRoutes.post("/refresh", validate(RefreshBody), authController.refresh);
authRoutes.post(
  "/request-password-reset",
  validate(RequestPasswordResetBody),
  authController.requestPasswordReset,
);
authRoutes.post(
  "/reset-password",
  validate(ResetPasswordBody),
  authController.resetPassword,
);
authRoutes.post(
  "/verify-email",
  validate(VerifyEmailBody),
  authController.verifyEmail,
);
authRoutes.post(
  "/verify-phone",
  authenticate,
  validate(VerifyPhoneBody),
  authController.verifyPhone,
);
authRoutes.get("/me", authenticate, authController.me);
authRoutes.post(
  "/sessions/revoke",
  authenticate,
  validate(RevokeSessionBody),
  authController.revokeSession,
);
authRoutes.post(
  "/mfa/setup",
  authenticate,
  validate(MFASetupBody),
  authController.setupMfa,
);
authRoutes.post(
  "/mfa/verify-setup",
  authenticate,
  validate(MFAVerifyBody),
  authController.verifyMfaSetup,
);
authRoutes.post(
  "/mfa/challenge/request",
  authenticate,
  validate(MFAChallengeRequestBody),
  authController.requestMfaChallenge,
);
authRoutes.post(
  "/mfa/challenge",
  authenticate,
  validate(MFAChallengeBody),
  authController.challengeMfa,
);
authRoutes.post(
  "/mfa/disable",
  authenticate,
  requireMfa,
  validate(MFADisableBody),
  authController.disableMfa,
);
authRoutes.get(
  "/mfa/backup-codes",
  authenticate,
  requireMfa,
  authController.getMfaBackupCodes,
);

export { authRoutes };
