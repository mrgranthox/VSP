import { defineConfig, devices } from "@playwright/test";

const backendUrl = process.env.E2E_BACKEND_BASE_URL ?? "http://127.0.0.1:3100";
const frontendUrl = process.env.E2E_FRONTEND_BASE_URL ?? "http://127.0.0.1:3101";
const backendPort = new URL(backendUrl).port || "3100";
const frontendPort = new URL(frontendUrl).port || "3101";
const frontendHost = new URL(frontendUrl).hostname || "127.0.0.1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendUrl,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm start",
      cwd: "../backend",
      env: {
        ...process.env,
        PORT: backendPort,
        APP_BASE_URL: backendUrl,
        CORS_ALLOWED_ORIGINS: frontendUrl
      },
      url: `${backendUrl}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: `npm run dev -- --host ${frontendHost} --port ${frontendPort} --mode e2e`,
      env: {
        ...process.env,
        VITE_API_BASE_URL: `${backendUrl}/api/v1`
      },
      url: frontendUrl,
      reuseExistingServer: false,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/superadmin.json"
      }
    }
  ]
});
