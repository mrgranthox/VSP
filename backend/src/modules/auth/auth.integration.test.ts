process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { authenticator } from "otplib";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";
import { twilioVerifyTesting } from "../../lib/twilio";
import { authTokenStoreTesting } from "./auth.token-store";

const api = request(app);

const password = "Change-This-Password-123!";
const updatedPassword = "Change-This-Password-456!";

const buildEmail = (label: string): string => `itest-${label}-${randomUUID()}@example.com`;

const buildPhone = (): string => `+1555${Date.now().toString().slice(-7)}`;

const getAccessToken = (body: any): string => body.data.tokenPair.accessToken as string;
const getRefreshToken = (body: any): string => body.data.tokenPair.refreshToken as string;

const cleanupIntegrationData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "itest-" } },
        { phone: { startsWith: "+1555" } }
      ]
    }
  });
};

before(async () => {
  await cleanupIntegrationData();
});

after(async () => {
  await cleanupIntegrationData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("core auth flow covers email verification, reset, refresh reuse, and logout", async () => {
  const email = buildEmail("core");

  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName: "Core",
    lastName: "Flow"
  });

  assert.equal(registerResponse.status, 201);
  const userId = registerResponse.body.data.userId as string;

  const verificationToken = await authTokenStoreTesting.getEmailVerificationToken(userId);
  assert.ok(verificationToken);

  const verifyEmailResponse = await api.post("/api/v1/auth/verify-email").send({ token: verificationToken });
  assert.equal(verifyEmailResponse.status, 200);

  const loginResponse = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({ email, password });
  assert.equal(loginResponse.status, 200);
  const accessToken = getAccessToken(loginResponse.body);

  const meResponse = await api.get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`);
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.data.user.email, email);
  assert.equal(meResponse.body.data.user.isEmailVerified, true);
  assert.equal("passwordHash" in meResponse.body.data.user, false);

  const requestResetResponse = await api.post("/api/v1/auth/request-password-reset").send({ email });
  assert.equal(requestResetResponse.status, 200);

  const resetToken = await authTokenStoreTesting.getPasswordResetToken(userId);
  assert.ok(resetToken);

  const resetResponse = await api.post("/api/v1/auth/reset-password").send({
    token: resetToken,
    newPassword: updatedPassword
  });
  assert.equal(resetResponse.status, 200);

  const oldPasswordLogin = await api.post("/api/v1/auth/login").send({ email, password });
  assert.equal(oldPasswordLogin.status, 401);
  assert.equal(oldPasswordLogin.body.error.code, "AUTH_INVALID_CREDENTIALS");

  const newPasswordLogin = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password: updatedPassword
  });
  assert.equal(newPasswordLogin.status, 200);

  const activeAccessToken = getAccessToken(newPasswordLogin.body);
  const originalRefreshToken = getRefreshToken(newPasswordLogin.body);

  const refreshResponse = await api.post("/api/v1/auth/refresh").send({ refreshToken: originalRefreshToken });
  assert.equal(refreshResponse.status, 200);
  const rotatedRefreshToken = refreshResponse.body.data.refreshToken as string;

  const refreshReuseResponse = await api.post("/api/v1/auth/refresh").send({ refreshToken: originalRefreshToken });
  assert.equal(refreshReuseResponse.status, 401);
  assert.equal(refreshReuseResponse.body.error.code, "AUTH_SESSION_EXPIRED");

  const rotatedReuseResponse = await api.post("/api/v1/auth/refresh").send({ refreshToken: rotatedRefreshToken });
  assert.equal(rotatedReuseResponse.status, 401);
  assert.equal(rotatedReuseResponse.body.error.code, "AUTH_SESSION_EXPIRED");

  const logoutAfterReuseResponse = await api.post("/api/v1/auth/logout").set("Authorization", `Bearer ${activeAccessToken}`).send({});
  assert.equal(logoutAfterReuseResponse.status, 401);
  assert.equal(logoutAfterReuseResponse.body.error.code, "AUTH_SESSION_EXPIRED");

  const reloginForLogoutResponse = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password: updatedPassword
  });
  assert.equal(reloginForLogoutResponse.status, 200);
  const logoutAccessToken = getAccessToken(reloginForLogoutResponse.body);

  const logoutResponse = await api.post("/api/v1/auth/logout").set("Authorization", `Bearer ${logoutAccessToken}`);
  assert.equal(logoutResponse.status, 200);

  const meAfterLogoutResponse = await api.get("/api/v1/auth/me").set("Authorization", `Bearer ${logoutAccessToken}`);
  assert.equal(meAfterLogoutResponse.status, 401);
  assert.equal(meAfterLogoutResponse.body.error.code, "AUTH_SESSION_EXPIRED");
});

test("TOTP MFA flow covers setup, challenge, backup code retrieval, and disable", async () => {
  const email = buildEmail("totp");

  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName: "Totp",
    lastName: "Flow"
  });

  assert.equal(registerResponse.status, 201);

  const loginResponse = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({ email, password });
  assert.equal(loginResponse.status, 200);
  const accessToken = getAccessToken(loginResponse.body);

  const setupResponse = await api.post("/api/v1/auth/mfa/setup").set("Authorization", `Bearer ${accessToken}`).send({ method: "totp" });
  assert.equal(setupResponse.status, 200);
  assert.match(setupResponse.body.data.qrCodeUrl as string, /^data:image\/png;base64,/);
  assert.ok(setupResponse.body.data.secret);

  const totpCode = authenticator.generate(setupResponse.body.data.secret as string);
  const verifySetupResponse = await api
    .post("/api/v1/auth/mfa/verify-setup")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ method: "totp", code: totpCode });

  assert.equal(verifySetupResponse.status, 200);
  assert.equal(verifySetupResponse.body.data.backupCodes.length, 8);

  const backupCodesWithoutMfa = await api.get("/api/v1/auth/mfa/backup-codes").set("Authorization", `Bearer ${accessToken}`);
  assert.equal(backupCodesWithoutMfa.status, 403);
  assert.equal(backupCodesWithoutMfa.body.error.code, "MFA_REQUIRED");

  const challengeResponse = await api
    .post("/api/v1/auth/mfa/challenge")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ method: "totp", code: authenticator.generate(setupResponse.body.data.secret as string) });

  assert.equal(challengeResponse.status, 200);
  const mfaAccessToken = challengeResponse.body.data.accessToken as string;

  const backupCodesResponse = await api.get("/api/v1/auth/mfa/backup-codes").set("Authorization", `Bearer ${mfaAccessToken}`);
  assert.equal(backupCodesResponse.status, 200);
  assert.deepEqual(backupCodesResponse.body.data.backupCodes, verifySetupResponse.body.data.backupCodes);

  const disableResponse = await api
    .post("/api/v1/auth/mfa/disable")
    .set("Authorization", `Bearer ${mfaAccessToken}`)
    .send({ method: "backup_code", code: verifySetupResponse.body.data.backupCodes[0] });

  assert.equal(disableResponse.status, 200);

  const backupCodesAfterDisable = await api.get("/api/v1/auth/mfa/backup-codes").set("Authorization", `Bearer ${mfaAccessToken}`);
  assert.equal(backupCodesAfterDisable.status, 403);
  assert.equal(backupCodesAfterDisable.body.error.code, "MFA_REQUIRED");
});

test("SMS MFA flow covers phone verification, Twilio mock setup, challenge, and disable", async () => {
  const email = buildEmail("sms");
  const phone = buildPhone();

  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    phone,
    password,
    firstName: "Sms",
    lastName: "Flow"
  });

  assert.equal(registerResponse.status, 201);

  const loginResponse = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({ email, password });
  assert.equal(loginResponse.status, 200);
  const accessToken = getAccessToken(loginResponse.body);

  const phoneVerificationCode = await twilioVerifyTesting.getMockCode("phone_verification", phone);
  assert.ok(phoneVerificationCode);

  const verifyPhoneResponse = await api
    .post("/api/v1/auth/verify-phone")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ otp: phoneVerificationCode });

  assert.equal(verifyPhoneResponse.status, 200);

  const setupSmsResponse = await api
    .post("/api/v1/auth/mfa/setup")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ method: "sms" });

  assert.equal(setupSmsResponse.status, 200);

  const smsSetupCode = await twilioVerifyTesting.getMockCode("mfa_setup", phone);
  assert.ok(smsSetupCode);

  const verifySetupResponse = await api
    .post("/api/v1/auth/mfa/verify-setup")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ method: "sms", code: smsSetupCode });

  assert.equal(verifySetupResponse.status, 200);
  assert.equal(verifySetupResponse.body.data.backupCodes.length, 8);

  const requestChallengeResponse = await api
    .post("/api/v1/auth/mfa/challenge/request")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ method: "sms" });

  assert.equal(requestChallengeResponse.status, 200);

  const smsChallengeCode = await twilioVerifyTesting.getMockCode("mfa_challenge", phone);
  assert.ok(smsChallengeCode);

  const challengeResponse = await api
    .post("/api/v1/auth/mfa/challenge")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ method: "sms", code: smsChallengeCode });

  assert.equal(challengeResponse.status, 200);
  const mfaAccessToken = challengeResponse.body.data.accessToken as string;

  const backupCodesResponse = await api.get("/api/v1/auth/mfa/backup-codes").set("Authorization", `Bearer ${mfaAccessToken}`);
  assert.equal(backupCodesResponse.status, 200);
  assert.deepEqual(backupCodesResponse.body.data.backupCodes, verifySetupResponse.body.data.backupCodes);

  const secondChallengeRequestResponse = await api
    .post("/api/v1/auth/mfa/challenge/request")
    .set("Authorization", `Bearer ${mfaAccessToken}`)
    .send({ method: "sms" });

  assert.equal(secondChallengeRequestResponse.status, 200);

  const smsDisableCode = await twilioVerifyTesting.getMockCode("mfa_challenge", phone);
  assert.ok(smsDisableCode);

  const disableResponse = await api
    .post("/api/v1/auth/mfa/disable")
    .set("Authorization", `Bearer ${mfaAccessToken}`)
    .send({ method: "sms", code: smsDisableCode });

  assert.equal(disableResponse.status, 200);

  const backupCodesAfterDisable = await api.get("/api/v1/auth/mfa/backup-codes").set("Authorization", `Bearer ${mfaAccessToken}`);
  assert.equal(backupCodesAfterDisable.status, 403);
  assert.equal(backupCodesAfterDisable.body.error.code, "MFA_REQUIRED");
});
