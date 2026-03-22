import { expect, test } from "@playwright/test";

import { configureTotpAndStepUp, loginThroughApi, seededAccounts, waitForAdminShell } from "./helpers";

test("seeded super admin can sign in, set up TOTP, and establish a stepped-up session", async ({ page }) => {
  const healthResponse = await page.request.get("http://localhost:3000/api/v1/health");
  expect(healthResponse.ok()).toBeTruthy();

  await loginThroughApi(page, seededAccounts.superAdmin.email, seededAccounts.superAdmin.password, "superadmin-setup");
  await waitForAdminShell(page);
  await expect(page).toHaveURL(/\/overview/);

  await configureTotpAndStepUp(page);
  await page.context().storageState({ path: "e2e/.auth/superadmin.json" });
});
