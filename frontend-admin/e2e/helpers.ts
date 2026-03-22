import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page } from "@playwright/test";
import { authenticator } from "otplib";

const currentDir = dirname(fileURLToPath(import.meta.url));
const authDir = resolve(currentDir, ".auth");
const superAdminMfaPath = resolve(authDir, "superadmin-mfa.json");

const seededAccounts = {
  superAdmin: {
    email: "superadmin@vocationalplatform.com",
    password: "Change-This-Password-123!"
  },
  moderator: {
    email: "moderator@vocationalplatform.com",
    password: "Change-This-Password-123!"
  },
  support: {
    email: "support@vocationalplatform.com",
    password: "Change-This-Password-123!"
  }
} as const;

const ensureAuthDir = () => {
  mkdirSync(authDir, { recursive: true });
};

const saveTotpSecret = (secret: string) => {
  ensureAuthDir();
  writeFileSync(superAdminMfaPath, JSON.stringify({ secret }, null, 2));
};

const loadTotpSecret = (): string => {
  const payload = JSON.parse(readFileSync(superAdminMfaPath, "utf8")) as { secret?: string };

  if (!payload.secret) {
    throw new Error(`Missing superadmin MFA secret at ${superAdminMfaPath}`);
  }

  return payload.secret;
};

const generateTotpCode = (secret: string): string => authenticator.generate(secret);

const dismissLoginMfaModalIfPresent = async (page: Page) => {
  const continueButton = page.getByTestId("login-mfa-continue");

  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
  }
};

const loginThroughApi = async (page: Page, email: string, password: string, deviceLabel: string) => {
  const response = await page.request.post("http://127.0.0.1:3000/api/v1/auth/login", {
    headers: {
      "content-type": "application/json",
      "x-device-type": `web-admin-e2e-${deviceLabel}-${Date.now()}`
    },
    data: {
      email,
      password
    }
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    data: {
      tokenPair: {
        accessToken: string;
        refreshToken: string;
        expiresAt: string;
      };
    };
  };

  await page.goto("/login");
  await page.evaluate((session) => {
    window.localStorage.setItem("vsp.admin.session", JSON.stringify(session));
  }, body.data.tokenPair);
  await page.goto("/overview");
};

const loginThroughUi = async (page: Page, email: string, password: string) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await dismissLoginMfaModalIfPresent(page);
};

const waitForAdminShell = async (page: Page) => {
  await expect(page).toHaveURL(/\/(overview|access-denied|session-expired|profile|notifications|reports|support-tickets|fraud-signals|moderation-cases)/);
};

const configureTotpAndStepUp = async (page: Page) => {
  await page.goto("/profile/mfa");
  await expect(page.getByTestId("mfa-start-totp-setup")).toBeVisible();

  await page.getByTestId("mfa-start-totp-setup").click();
  const secretLocator = page.getByTestId("mfa-totp-secret");
  await expect(secretLocator).toBeVisible();
  const secret = (await secretLocator.innerText()).trim();
  saveTotpSecret(secret);

  await page.getByTestId("mfa-totp-setup-code").fill(generateTotpCode(secret));
  await page.getByTestId("mfa-totp-verify-setup").click();
  await expect(page.getByText("MFA setup verified")).toBeVisible();

  await page.getByTestId("mfa-step-up-method-totp").click();
  await page.getByTestId("mfa-step-up-code").fill(generateTotpCode(secret));
  await page.getByTestId("mfa-step-up-verify").click();
  await expect(page.getByText("Session elevated for dangerous actions")).toBeVisible();
};

const ensureFreshStepUp = async (page: Page) => {
  const secret = loadTotpSecret();

  await page.goto("/profile/mfa");
  await expect(page.getByTestId("mfa-step-up-verify")).toBeVisible();
  await page.getByTestId("mfa-step-up-method-totp").click();
  await page.getByTestId("mfa-step-up-code").fill(generateTotpCode(secret));
  await page.getByTestId("mfa-step-up-verify").click();
  await expect(page.getByText("Session elevated for dangerous actions")).toBeVisible();
};

export {
  configureTotpAndStepUp,
  ensureFreshStepUp,
  loginThroughApi,
  loginThroughUi,
  saveTotpSecret,
  seededAccounts,
  waitForAdminShell
};
