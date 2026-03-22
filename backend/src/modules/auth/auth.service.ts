import { randomBytes, randomInt } from "node:crypto";

import type { AdminRoleKey, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

import { EventBus } from "../../lib/eventBus";
import { ApiError, Errors } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { twilioVerifyProvider } from "../../lib/twilio";
import type { ActorContext } from "../../types/actor";
import { authMfaStore } from "./auth.mfa-store";
import {
  decryptValue,
  encryptValue,
  generateBackupCodes,
  generateTotpQrCode,
  generateTotpSecret,
  hashBackupCode,
  verifyTotpCode
} from "./auth.mfa";
import { AuthRepository, type UserWithRoles, type UserWithRolesAndMfa } from "./auth.repository";
import { authTokenStore } from "./auth.token-store";
import { buildSessionTokens, hashToken, issueAccessToken } from "./auth.tokens";

interface RegisterInput {
  email?: string;
  phone?: string;
  password?: string;
  firstName: string;
  lastName: string;
}

interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface VerifyMfaSetupInput {
  method: "totp" | "sms";
  code: string;
}

interface MfaChallengeInput {
  method: "totp" | "sms" | "backup_code";
  code: string;
}

interface MfaChallengeResult {
  sessionId: string;
  accessToken: string;
  expiresAt: Date;
  method: string;
}

class AuthService {
  constructor(private readonly repository: AuthRepository = new AuthRepository()) {}

  private assertUserCanAuthenticate(status: UserStatus): void {
    if (status === "SUSPENDED") {
      throw Errors.USER_SUSPENDED();
    }

    if (status === "DELETED") {
      throw Errors.AUTH_INVALID_CREDENTIALS();
    }
  }

  private async ensureRegisterIdentifierAvailable(input: RegisterInput): Promise<void> {
    if (input.email) {
      const existing = await this.repository.findUserByEmail(input.email);

      if (existing) {
        throw new ApiError("CONFLICT", 409, "A user with that email already exists");
      }
    }

    if (input.phone) {
      const existing = await this.repository.findUserByPhone(input.phone);

      if (existing) {
        throw new ApiError("CONFLICT", 409, "A user with that phone already exists");
      }
    }
  }

  private buildTokenPairData(data: {
    userId: string;
    roles: AdminRoleKey[];
    status: UserStatus;
    mfaVerified: boolean;
    sessionId?: string;
  }): {
    sessionId: string;
    tokenPair: TokenPair;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
  } {
    const artifacts = buildSessionTokens(data);

    return {
      sessionId: artifacts.sessionId,
      refreshTokenHash: artifacts.refreshTokenHash,
      refreshTokenExpiresAt: artifacts.refreshTokenExpiresAt,
      tokenPair: {
        accessToken: artifacts.accessToken,
        refreshToken: artifacts.refreshToken,
        expiresAt: artifacts.accessTokenExpiresAt
      }
    };
  }

  private async getUserForMfa(userId: string): Promise<UserWithRolesAndMfa> {
    const user = await this.repository.getUserWithRolesAndMfa(userId);

    if (!user) {
      throw Errors.USER_NOT_FOUND();
    }

    return user;
  }

  private assertPhoneAvailableForSms(user: UserWithRolesAndMfa): string {
    if (!user.phone) {
      throw Errors.VALIDATION_FAILED({ formErrors: ["Phone number required for SMS MFA"] });
    }

    if (!user.isPhoneVerified) {
      throw Errors.AUTH_PHONE_NOT_VERIFIED();
    }

    return user.phone;
  }

  private buildBackupCodePayload(backupCodes: string[]) {
    return {
      backupCodeHashes: backupCodes.map((code) => hashBackupCode(code)),
      backupCodeCiphertexts: backupCodes.map((code) => encryptValue(code))
    };
  }

  private consumeBackupCode(user: UserWithRolesAndMfa, code: string) {
    if (!user.mfaConfig) {
      throw Errors.MFA_NOT_CONFIGURED();
    }

    const codeHash = hashBackupCode(code);
    const index = user.mfaConfig.backupCodeHashes.findIndex((value) => value === codeHash);

    if (index < 0) {
      throw Errors.MFA_INVALID_CODE();
    }

    return {
      backupCodeHashes: user.mfaConfig.backupCodeHashes.filter((_, currentIndex) => currentIndex !== index),
      backupCodeCiphertexts: user.mfaConfig.backupCodeCiphertexts.filter((_, currentIndex) => currentIndex !== index)
    };
  }

  private async issueMfaAccessToken(user: UserWithRolesAndMfa, sessionId: string): Promise<MfaChallengeResult> {
    const { accessToken, accessTokenExpiresAt } = issueAccessToken(
      {
        userId: user.id,
        roles: this.repository.getRoles(user),
        status: user.status,
        mfaVerified: true
      },
      sessionId
    );

    return {
      sessionId,
      accessToken,
      expiresAt: accessTokenExpiresAt,
      method: user.mfaConfig?.method ?? "unknown"
    };
  }

  async register(input: RegisterInput): Promise<{ userId: string; status: string }> {
    await this.ensureRegisterIdentifierAvailable(input);

    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
    const createdUser = await this.repository.createUserWithProfile({
      email: input.email,
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName
    });

    if (createdUser.email) {
      const verificationToken = randomBytes(32).toString("hex");
      await authTokenStore.saveEmailVerificationToken(createdUser.id, verificationToken, 24 * 60 * 60);
      logger.info({ userId: createdUser.id, verificationToken }, "Generated email verification token");
    }

    if (createdUser.phone) {
      await twilioVerifyProvider.sendVerification({
        to: createdUser.phone,
        purpose: "phone_verification"
      });
    }

    await EventBus.emit("USER_REGISTERED", {
      userId: createdUser.id,
      email: createdUser.email,
      phone: createdUser.phone,
      createdAt: createdUser.createdAt.toISOString()
    });

    return {
      userId: createdUser.id,
      status: createdUser.status
    };
  }

  async login(input: LoginInput, ipAddress: string, deviceType?: string): Promise<{ tokenPair: TokenPair; userId: string }> {
    const user = await this.repository.findUserByIdentifier({
      email: input.email,
      phone: input.phone
    });

    if (!user?.passwordHash) {
      throw Errors.AUTH_INVALID_CREDENTIALS();
    }

    this.assertUserCanAuthenticate(this.repository.getUserStatus(user));

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw Errors.AUTH_INVALID_CREDENTIALS();
    }

    const roles = this.repository.getRoles(user);
    const { sessionId, refreshTokenHash, refreshTokenExpiresAt, tokenPair } = this.buildTokenPairData({
      userId: user.id,
      roles,
      status: user.status,
      mfaVerified: false
    });

    await this.repository.createSession({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      deviceType,
      ipAddress,
      mfaVerified: false,
      mfaMethod: null,
      expiresAt: refreshTokenExpiresAt
    });
    await this.repository.updateLastLoginAt(user.id);

    return {
      tokenPair,
      userId: user.id
    };
  }

  async logout(actor: ActorContext, sessionId: string): Promise<void> {
    const revoked = await this.repository.revokeSessionForUser(sessionId, actor.userId);

    if (!revoked) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const hashedRefreshToken = hashToken(refreshToken);
    const session = await this.repository.findSessionByRefreshTokenHash(hashedRefreshToken);

    if (!session) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    if (session.revokedAt) {
      await this.repository.revokeAllSessionsForUser(session.userId);
      await EventBus.emit("FRAUD_SIGNAL_CREATED", {
        userId: session.userId,
        signalKey: "REFRESH_TOKEN_REUSE",
        score: 80
      });
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    if (session.expiresAt <= new Date()) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    this.assertUserCanAuthenticate(this.repository.getUserStatus(session.user));

    const roles = this.repository.getRoles(session.user);
    const { sessionId, refreshTokenHash, refreshTokenExpiresAt, tokenPair } = this.buildTokenPairData({
      userId: session.userId,
      roles,
      status: session.user.status,
      mfaVerified: session.mfaVerified
    });

    await this.repository.rotateSession(session.id, {
      id: sessionId,
      userId: session.userId,
      refreshTokenHash,
      deviceType: session.deviceType ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
      mfaVerified: session.mfaVerified,
      mfaVerifiedAt: session.mfaVerifiedAt,
      mfaMethod: session.mfaMethod,
      expiresAt: refreshTokenExpiresAt
    });

    return tokenPair;
  }

  async requestPasswordReset(input: { email?: string; phone?: string }): Promise<void> {
    const user = await this.repository.findUserByIdentifier(input);

    if (!user) {
      return;
    }

    const token = input.phone ? String(randomInt(100_000, 1_000_000)) : randomBytes(32).toString("hex");
    await authTokenStore.savePasswordResetToken(user.id, token, 60 * 60);
    logger.info({ userId: user.id, token, channel: input.phone ? "phone" : "email" }, "Generated password reset token");
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await authTokenStore.consumePasswordResetToken(token);

    if (!userId) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.repository.updatePasswordAndRevokeSessions(userId, passwordHash);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await authTokenStore.consumeEmailVerificationToken(token);

    if (!userId) {
      throw Errors.AUTH_EMAIL_NOT_VERIFIED();
    }

    await this.repository.markEmailVerified(userId);
  }

  async verifyPhone(actor: ActorContext, otp: string): Promise<void> {
    const user = await this.getUserForMfa(actor.userId);

    if (!user.phone) {
      throw Errors.AUTH_PHONE_NOT_VERIFIED();
    }

    const verified = await twilioVerifyProvider.checkVerification({
      to: user.phone,
      purpose: "phone_verification",
      code: otp
    });

    if (!verified) {
      throw Errors.AUTH_PHONE_NOT_VERIFIED();
    }

    await this.repository.markPhoneVerified(actor.userId);
  }

  async revokeSession(actor: ActorContext, sessionId: string): Promise<void> {
    const revoked = await this.repository.revokeSessionForUser(sessionId, actor.userId);

    if (!revoked) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
  }

  async getMe(actor: ActorContext): Promise<{ user: Omit<UserWithRoles, "passwordHash">; roles: AdminRoleKey[] }> {
    const user = await this.repository.getUserWithRoles(actor.userId);

    if (!user) {
      throw Errors.USER_NOT_FOUND();
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return {
      user: safeUser,
      roles: this.repository.getRoles(user)
    };
  }

  async setupMFA(actor: ActorContext, method: "totp" | "sms"): Promise<{ secret?: string; qrCodeUrl?: string }> {
    const user = await this.getUserForMfa(actor.userId);

    if (method === "totp") {
      const secret = generateTotpSecret();
      const qrCodeUrl = await generateTotpQrCode(user.email ?? user.phone ?? user.id, secret);

      await authMfaStore.savePendingSetup(actor.userId, {
        method,
        totpSecretCiphertext: encryptValue(secret)
      });

      return { secret, qrCodeUrl };
    }

    const phone = this.assertPhoneAvailableForSms(user);

    await authMfaStore.savePendingSetup(actor.userId, { method });
    await twilioVerifyProvider.sendVerification({ to: phone, purpose: "mfa_setup" });

    return {};
  }

  async verifyMFASetup(actor: ActorContext, input: VerifyMfaSetupInput): Promise<{ backupCodes: string[] }> {
    const user = await this.getUserForMfa(actor.userId);
    const pendingSetup = await authMfaStore.getPendingSetup(actor.userId);

    if (!pendingSetup || pendingSetup.method !== input.method) {
      throw Errors.VALIDATION_FAILED({ formErrors: ["No matching MFA setup is pending for this account"] });
    }

    let totpSecretCiphertext: string | null = null;

    if (input.method === "totp") {
      if (!pendingSetup.totpSecretCiphertext) {
        throw Errors.VALIDATION_FAILED({ formErrors: ["Missing pending TOTP setup secret"] });
      }

      const secret = decryptValue(pendingSetup.totpSecretCiphertext);

      if (!verifyTotpCode(secret, input.code)) {
        throw Errors.MFA_INVALID_CODE();
      }

      totpSecretCiphertext = pendingSetup.totpSecretCiphertext;
    } else {
      const phone = this.assertPhoneAvailableForSms(user);
      const verified = await twilioVerifyProvider.checkVerification({
        to: phone,
        purpose: "mfa_setup",
        code: input.code
      });

      if (!verified) {
        throw Errors.MFA_INVALID_CODE();
      }
    }

    const backupCodes = generateBackupCodes();
    const backupCodePayload = this.buildBackupCodePayload(backupCodes);

    await this.repository.upsertMfaConfig({
      userId: actor.userId,
      method: input.method,
      totpSecretCiphertext,
      ...backupCodePayload
    });
    await authMfaStore.clearPendingSetup(actor.userId);

    await EventBus.emit("MFA_ENABLED", {
      userId: actor.userId,
      method: input.method,
      enabledAt: new Date().toISOString()
    });

    return { backupCodes };
  }

  async requestMFAChallenge(actor: ActorContext, method: "sms"): Promise<void> {
    const user = await this.getUserForMfa(actor.userId);

    if (!user.mfaConfig || user.mfaConfig.method !== method) {
      throw Errors.MFA_NOT_CONFIGURED();
    }

    const phone = this.assertPhoneAvailableForSms(user);
    await twilioVerifyProvider.sendVerification({
      to: phone,
      purpose: "mfa_challenge"
    });
  }

  async challengeMFA(actor: ActorContext, input: MfaChallengeInput): Promise<MfaChallengeResult> {
    if (!actor.sessionId) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const user = await this.getUserForMfa(actor.userId);

    if (!user.mfaConfig) {
      throw Errors.MFA_NOT_CONFIGURED();
    }

    let sessionMethod = user.mfaConfig.method;

    if (input.method === "totp") {
      if (user.mfaConfig.method !== "totp" || !user.mfaConfig.totpSecretCiphertext) {
        throw Errors.MFA_NOT_CONFIGURED();
      }

      const secret = decryptValue(user.mfaConfig.totpSecretCiphertext);

      if (!verifyTotpCode(secret, input.code)) {
        throw Errors.MFA_INVALID_CODE();
      }
    } else if (input.method === "sms") {
      if (user.mfaConfig.method !== "sms") {
        throw Errors.MFA_NOT_CONFIGURED();
      }

      const phone = this.assertPhoneAvailableForSms(user);
      const verified = await twilioVerifyProvider.checkVerification({
        to: phone,
        purpose: "mfa_challenge",
        code: input.code
      });

      if (!verified) {
        throw Errors.MFA_INVALID_CODE();
      }
    } else {
      const updatedBackupCodes = this.consumeBackupCode(user, input.code);

      await this.repository.upsertMfaConfig({
        userId: actor.userId,
        method: user.mfaConfig.method,
        totpSecretCiphertext: user.mfaConfig.totpSecretCiphertext,
        ...updatedBackupCodes
      });
      sessionMethod = user.mfaConfig.method;
    }

    const updated = await this.repository.markSessionMfaVerified(actor.sessionId, actor.userId, sessionMethod);

    if (!updated) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const refreshedUser = await this.getUserForMfa(actor.userId);
    return this.issueMfaAccessToken(refreshedUser, actor.sessionId);
  }

  async disableMFA(actor: ActorContext, input: MfaChallengeInput): Promise<void> {
    const user = await this.getUserForMfa(actor.userId);

    if (!user.mfaConfig) {
      throw Errors.MFA_NOT_CONFIGURED();
    }

    if (input.method === "totp") {
      if (user.mfaConfig.method !== "totp" || !user.mfaConfig.totpSecretCiphertext) {
        throw Errors.MFA_NOT_CONFIGURED();
      }

      const secret = decryptValue(user.mfaConfig.totpSecretCiphertext);

      if (!verifyTotpCode(secret, input.code)) {
        throw Errors.MFA_INVALID_CODE();
      }
    } else if (input.method === "sms") {
      if (user.mfaConfig.method !== "sms") {
        throw Errors.MFA_NOT_CONFIGURED();
      }

      const phone = this.assertPhoneAvailableForSms(user);
      const verified = await twilioVerifyProvider.checkVerification({
        to: phone,
        purpose: "mfa_challenge",
        code: input.code
      });

      if (!verified) {
        throw Errors.MFA_INVALID_CODE();
      }
    } else {
      this.consumeBackupCode(user, input.code);
    }

    await this.repository.deleteMfaConfig(actor.userId);

    if (actor.sessionId) {
      await this.repository.clearSessionMfaVerified(actor.sessionId, actor.userId);
    }

    await EventBus.emit("MFA_DISABLED", {
      userId: actor.userId,
      method: user.mfaConfig.method,
      disabledAt: new Date().toISOString()
    });
  }

  async getMfaBackupCodes(actor: ActorContext): Promise<{ method: string; backupCodes: string[] }> {
    const user = await this.getUserForMfa(actor.userId);

    if (!user.mfaConfig) {
      throw Errors.MFA_NOT_CONFIGURED();
    }

    return {
      method: user.mfaConfig.method,
      backupCodes: user.mfaConfig.backupCodeCiphertexts.map((ciphertext) => decryptValue(ciphertext))
    };
  }
}

export { AuthService };
