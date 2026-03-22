import { expect, test } from "@playwright/test";

import { configureTotpAndStepUp, loginThroughUi, seededAccounts, waitForAdminShell } from "./helpers";

const backendBaseUrl = process.env.E2E_BACKEND_BASE_URL ?? "http://127.0.0.1:3100";

test("seeded super admin can sign in, set up TOTP, and establish a stepped-up session", async ({ page }) => {
  const healthResponse = await page.request.get(`${backendBaseUrl}/api/v1/health`);
  expect(healthResponse.ok()).toBeTruthy();

  await loginThroughUi(page, seededAccounts.superAdmin.email, seededAccounts.superAdmin.password);
  await waitForAdminShell(page);
  await expect(page).toHaveURL(/\/overview/);

  await configureTotpAndStepUp(page);
  await page.context().storageState({ path: "e2e/.auth/superadmin.json" });
});
