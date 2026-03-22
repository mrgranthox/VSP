import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page } from "@playwright/test";
import { authenticator } from "otplib";

const currentDir = dirname(fileURLToPath(import.meta.url));
const authDir = resolve(currentDir, ".auth");
const superAdminMfaPath = resolve(authDir, "superadmin-mfa.json");
const backendBaseUrl = process.env.E2E_BACKEND_BASE_URL ?? "http://127.0.0.1:3100";

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
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForFreshTotpCode = async (secret: string, previousCode?: string): Promise<string> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 35_000) {
    const nextCode = generateTotpCode(secret);

    if (!previousCode || nextCode !== previousCode) {
      return nextCode;
    }

    await sleep(1_000);
  }

  return generateTotpCode(secret);
};

const hasStoredTotpSecret = (): boolean => existsSync(superAdminMfaPath);

const dismissLoginMfaModalIfPresent = async (page: Page) => {
  const continueButton = page.getByTestId("login-mfa-continue");

  await continueButton.waitFor({ state: "visible", timeout: 5_000 }).catch(() => null);

  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
    return true;
  }

  return false;
};

const loginThroughApi = async (page: Page, email: string, password: string, deviceLabel: string) => {
  const response = await page.request.post(`${backendBaseUrl}/api/v1/auth/login`, {
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

  const navigationPromise = page
    .waitForURL(/\/(overview|access-denied|session-expired|profile|notifications|reports|support-tickets|fraud-signals|moderation-cases)/, {
      timeout: 8_000
    })
    .then(() => "navigated")
    .catch(() => null);

  const modalDismissed = await Promise.race([navigationPromise, dismissLoginMfaModalIfPresent(page).then((dismissed) => (dismissed ? "dismissed" : null))]);

  if (modalDismissed === "dismissed") {
    await page.waitForURL(/\/(overview|access-denied|session-expired|profile|notifications|reports|support-tickets|fraud-signals|moderation-cases)/, {
      timeout: 8_000
    });
  }
};

const waitForAdminShell = async (page: Page) => {
  await expect(page).toHaveURL(/\/(overview|access-denied|session-expired|profile|notifications|reports|support-tickets|fraud-signals|moderation-cases)/);
};

const stepUpWithSecret = async (page: Page, secret: string, options?: { avoidCode?: string }) => {
  await page.goto("/profile/mfa");
  await expect(page.getByTestId("mfa-step-up-verify")).toBeVisible();
  await page.getByTestId("mfa-step-up-method-totp").click();

  const submitStepUpCode = async (code: string) => {
    const codeField = page.getByTestId("mfa-step-up-code");
    await codeField.fill("");
    await codeField.fill(code);
    await page.getByTestId("mfa-step-up-verify").click();

    const successToast = page
      .getByText("Session elevated for dangerous actions")
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    const verifiedState = page
      .getByText(/Session MFA:\s*verified/i)
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    return (await Promise.race([successToast, verifiedState])) === true;
  };

  let code = await waitForFreshTotpCode(secret, options?.avoidCode);

  if (await submitStepUpCode(code)) {
    return;
  }

  code = await waitForFreshTotpCode(secret, code);

  if (await submitStepUpCode(code)) {
    return;
  }

  throw new Error("Unable to elevate the admin session with the provided TOTP secret");
};

const configureTotpAndStepUp = async (page: Page) => {
  if (hasStoredTotpSecret()) {
    try {
      await stepUpWithSecret(page, loadTotpSecret());
      return;
    } catch {
      // Fall through to full setup when the stored secret is stale or the DB was reset.
    }
  }

  await page.goto("/profile/mfa");
  const startSetupButton = page.getByTestId("mfa-start-totp-setup");
  const stepUpButton = page.getByTestId("mfa-step-up-verify");

  if (!(await startSetupButton.isVisible().catch(() => false)) && (await stepUpButton.isVisible().catch(() => false)) && hasStoredTotpSecret()) {
    await stepUpWithSecret(page, loadTotpSecret());
    return;
  }

  await expect(startSetupButton).toBeVisible();

  await startSetupButton.click();
  const secretLocator = page.getByTestId("mfa-totp-secret");
  await expect(secretLocator).toBeVisible();
  const secret = (await secretLocator.innerText()).trim();
  saveTotpSecret(secret);

  const setupCode = generateTotpCode(secret);

  await page.getByTestId("mfa-totp-setup-code").fill(setupCode);
  await page.getByTestId("mfa-totp-verify-setup").click();
  await expect(page.getByText("MFA setup verified")).toBeVisible();

  await stepUpWithSecret(page, secret, { avoidCode: setupCode });
};

const ensureFreshStepUp = async (page: Page) => {
  await stepUpWithSecret(page, loadTotpSecret());
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
