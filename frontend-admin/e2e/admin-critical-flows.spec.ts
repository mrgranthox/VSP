import { expect, test } from "@playwright/test";

const expectCsvDownload = async (page: import("@playwright/test").Page, triggerTestId: string) => {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId(triggerTestId).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename().endsWith(".csv")).toBeTruthy();
  await download.delete();
};

test.describe.serial("admin critical browser workflows", () => {
  test("notification center opens from the topbar and drives the detail desk", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    await page.getByTestId("topbar-notifications-toggle").click();
    await expect(page.getByTestId("topbar-notifications-panel")).toBeVisible();
    await page.getByTestId("topbar-notifications-open-inbox").click();

    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.locator("main").getByRole("heading", { name: /Notifications Center|Notification Detail/ }).first()).toBeVisible();

    const firstNotification = page.locator("[data-testid^='notification-feed-item-']").first();
    await expect(firstNotification).toBeVisible();
    await firstNotification.click();

    await expect(page).toHaveURL(/\/notifications\/.+/);
    await expect(page.locator("main").getByRole("heading", { name: "Notification Detail" })).toBeVisible();

    const markReadButton = page.getByTestId("notification-mark-read");

    if (await markReadButton.isVisible().catch(() => false)) {
      await markReadButton.click();
      await expect(page.getByText(/Read/i)).toBeVisible();
    }
  });

  test("reports queue supports CSV export and bulk triage after fresh MFA", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByTestId("reports-page")).toBeVisible();
    await expect(page.getByRole("button", { name: /Inspect queue item/i }).first()).toBeVisible();

    await expectCsvDownload(page, "reports-export");

    await page.getByTestId("reports-select-page").click();
    await page.getByTestId("reports-bulk-status").selectOption("UNDER_REVIEW");
    await page.getByTestId("reports-bulk-notes").fill("Bulk triage verified by Playwright browser coverage.");
    await page.getByTestId("reports-bulk-submit").click();

    await expect(page.getByText(/reports updated/i)).toBeVisible();
  });

  test("moderation cases support CSV export and bulk actions after fresh MFA", async ({ page }) => {
    await page.goto("/moderation-cases");
    await expect(page.getByTestId("moderation-cases-page")).toBeVisible();
    await expect(page.getByRole("button", { name: /Inspect case/i }).first()).toBeVisible();

    await expectCsvDownload(page, "moderation-export");

    await page.getByTestId("moderation-select-page").click();
    await page.getByTestId("moderation-bulk-action-type").selectOption("REVIEW_NOTE");
    await page.getByTestId("moderation-bulk-notes").fill("Bulk moderation note recorded by browser coverage.");
    await page.getByTestId("moderation-bulk-submit").click();

    await expect(page.getByText(/moderation cases updated/i)).toBeVisible();
  });

  test("fraud signals support CSV export and bulk actions after fresh MFA", async ({ page }) => {
    await page.goto("/fraud-signals");
    await expect(page.getByTestId("fraud-signals-page")).toBeVisible();
    await expect(page.getByRole("button", { name: /Inspect signal/i }).first()).toBeVisible();

    await expectCsvDownload(page, "fraud-export");

    await page.getByTestId("fraud-select-page").click();
    await page.getByTestId("fraud-bulk-action").selectOption("REVIEW");
    await page.getByTestId("fraud-bulk-notes").fill("Fraud signal review recorded by browser coverage.");
    await page.getByTestId("fraud-bulk-submit").click();

    await expect(page.getByText(/fraud signals updated/i)).toBeVisible();
  });

  test("support tickets and audit logs support operational exports and bulk updates", async ({ page }) => {
    const supportNote = `Browser coverage internal note for the support casefile ${Date.now()}.`;

    await page.goto("/support-tickets");
    await expect(page.getByTestId("support-tickets-page")).toBeVisible();
    await expect(page.getByRole("link", { name: /Open ticket/i }).first()).toBeVisible();

    await expectCsvDownload(page, "support-export");

    await page.getByTestId("support-select-page").click();
    await page.getByTestId("support-bulk-status").selectOption("WAITING_INTERNAL");
    await page.getByTestId("support-bulk-submit").click();

    await expect(page.getByText(/support tickets updated/i)).toBeVisible();

    await page.getByRole("link", { name: /Open ticket/i }).first().click();
    await expect(page.getByTestId("support-ticket-detail-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Remediation Playbook" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Related Entity History" })).toBeVisible();
    await page.getByTestId("support-ticket-reply-body").fill(supportNote);
    await page.getByTestId("support-ticket-internal-note").check();
    await page.getByTestId("support-ticket-send-update").click();
    await expect(page.getByTestId("support-ticket-message-timeline").getByText(supportNote)).toBeVisible();

    await page.goto("/audit-logs");
    await expect(page.getByTestId("audit-logs-page")).toBeVisible();
    await expectCsvDownload(page, "audit-export");
  });

  test("content operations exposes linked evidence and moderation guidance", async ({ page }) => {
    await page.goto("/content");
    await expect(page.getByRole("main").getByRole("heading", { name: "Content Operations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Moderation footprint" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Reports spotlight/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open full report detail/i })).toBeVisible();
  });
});
