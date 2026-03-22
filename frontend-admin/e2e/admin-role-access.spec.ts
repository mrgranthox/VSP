import { expect, test } from "@playwright/test";

import { loginThroughApi, seededAccounts, waitForAdminShell } from "./helpers";

test.use({
  storageState: {
    cookies: [],
    origins: []
  }
});

test.describe("admin role access boundaries", () => {
  test("moderator can access moderation lanes but is denied support operations", async ({ page }) => {
    await loginThroughApi(page, seededAccounts.moderator.email, seededAccounts.moderator.password, "moderator-role-access");
    await waitForAdminShell(page);

    await page.goto("/reports");
    await expect(page.getByTestId("reports-page")).toBeVisible();

    await page.goto("/support-tickets");
    await expect(page).toHaveURL(/\/access-denied/);
    await expect(page.getByRole("heading", { name: "Access denied" }).first()).toBeVisible();
  });

  test("support can access ticket operations but is denied config management", async ({ page }) => {
    await loginThroughApi(page, seededAccounts.support.email, seededAccounts.support.password, "support-role-access");
    await waitForAdminShell(page);

    await page.goto("/support-tickets");
    await expect(page.getByTestId("support-tickets-page")).toBeVisible();

    await page.goto("/configs");
    await expect(page).toHaveURL(/\/access-denied/);
    await expect(page.getByRole("heading", { name: "Access denied" }).first()).toBeVisible();
  });
});
