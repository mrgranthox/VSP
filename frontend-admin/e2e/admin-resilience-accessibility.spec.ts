import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const expectNoSeriousOrCriticalViolations = async (page: Page, path: string, readyTestId: string) => {
  await page.goto(path);
  await expect(page.getByTestId(readyTestId)).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const violations = results.violations.filter((violation) => {
    return violation.impact === "serious" || violation.impact === "critical";
  });

  expect(
    violations,
    violations.length > 0
      ? violations
          .map((violation) => `${violation.id}: ${violation.help} (${violation.impact})`)
          .join("\n")
      : "No serious accessibility violations"
  ).toEqual([]);
};

test.describe.serial("admin resilience and accessibility", () => {
  test("route-level error boundary contains a crashing route in dev", async ({ page }) => {
    await page.goto("/__test/error-boundary");
    await expect(page.getByTestId("route-error-boundary")).toBeVisible();
    await expect(page.getByText("Intentional dev probe crash for admin error boundary verification")).toBeVisible();
    await page.getByTestId("route-error-boundary-reset").click();
    await expect(page).toHaveURL(/\/overview/);
  });

  test("critical admin pages have no serious or critical accessibility violations", async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, "/overview", "overview-page");
    await expectNoSeriousOrCriticalViolations(page, "/notifications", "notifications-page");
    await expectNoSeriousOrCriticalViolations(page, "/reports", "reports-page");
    await expectNoSeriousOrCriticalViolations(page, "/support-tickets", "support-tickets-page");
    await expectNoSeriousOrCriticalViolations(page, "/profile/mfa", "mfa-step-up-verify");
  });
});
