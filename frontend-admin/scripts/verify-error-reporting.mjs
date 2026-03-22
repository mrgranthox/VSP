import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

import { chromium } from "@playwright/test";

const frontendPort = 3011;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const projectDir = fileURLToPath(new URL("..", import.meta.url));

const startReceiver = async () => {
  const requests = [];

  const server = createServer((req, res) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      requests.push({
        method: req.method ?? "GET",
        url: req.url ?? "/",
        headers: req.headers,
        body: Buffer.concat(chunks).toString("utf8")
      });

      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: true }));
    });
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  assert(address && typeof address === "object", "receiver did not expose a bindable address");

  return {
    url: `http://127.0.0.1:${address.port}/reports`,
    requests,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(undefined);
        });
      })
  };
};

const waitForUrl = async (url, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Server is still booting.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
};

const terminate = async (child) => {
  if (child.exitCode !== null) {
    return;
  }

  if (child.pid) {
    process.kill(-child.pid, "SIGINT");
  } else {
    child.kill("SIGINT");
  }
  const result = await Promise.race([
    once(child, "exit"),
    delay(5_000).then(() => "timeout")
  ]);

  if (result === "timeout" && child.exitCode === null) {
    if (child.pid) {
      process.kill(-child.pid, "SIGKILL");
    } else {
      child.kill("SIGKILL");
    }
    await once(child, "exit");
  }
};

const waitForReport = async (requests, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const postRequest = requests.find((request) => request.method === "POST");

    if (postRequest) {
      return postRequest;
    }

    await delay(250);
  }

  throw new Error("Timed out waiting for frontend error report delivery");
};

const main = async () => {
  const receiver = await startReceiver();
  const devServer = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(frontendPort)], {
    cwd: projectDir,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      VITE_ERROR_REPORTING_ENABLED: "true",
      VITE_ERROR_REPORTING_ENDPOINT: receiver.url,
      VITE_APP_RELEASE: "verify-error-reporting"
    }
  });

  devServer.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  devServer.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  try {
    await waitForUrl(frontendUrl);

    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.goto(`${frontendUrl}/__test/error-boundary`);
      await page.getByTestId("route-error-boundary").waitFor({ state: "visible", timeout: 15_000 });
      const request = await waitForReport(receiver.requests);
      const payload = JSON.parse(request.body);

      assert.equal(request.url, "/reports", "frontend error reporting hit the wrong endpoint");
      assert(request.body.includes("Intentional dev probe crash for admin error boundary verification"), "frontend error report did not include the expected error message");
      assert(["react.error-boundary", "window.error", "unhandledrejection"].includes(payload.source), "frontend error report did not include a recognized source");

      console.log(`Frontend error reporting verified with ${receiver.requests.length} delivered event(s)`);
    } finally {
      await browser.close();
    }
  } finally {
    await terminate(devServer);
    await receiver.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
