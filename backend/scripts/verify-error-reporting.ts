import { createServer } from "node:http";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";

interface CapturedRequest {
  method: string;
  url: string;
  body: string;
}

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const closeServer = async (server: ReturnType<typeof createServer>): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const startSentryReceiver = async () => {
  const requests: CapturedRequest[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({
        method: req.method ?? "GET",
        url: req.url ?? "/",
        body
      });

      res.writeHead(200, {
        "content-type": "application/json"
      });
      res.end("{}");
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = server.address();
  assert(address && typeof address !== "string", "Error-reporting receiver did not expose a TCP port");

  return {
    server,
    port: (address as AddressInfo).port,
    requests
  };
};

const main = async (): Promise<void> => {
  const message = "itest.sentry.error.reporting";
  const receiver = await startSentryReceiver();
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem"
    },
    publicKeyEncoding: {
      type: "spki",
      format: "pem"
    }
  });

  process.env.NODE_ENV ??= "development";
  process.env.APP_NAME ??= "vsp-backend";
  process.env.APP_BASE_URL ??= "http://127.0.0.1:3000";
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@127.0.0.1:5432/vsp_verify?schema=public";
  process.env.REDIS_URL ??= "redis://127.0.0.1:6379";
  process.env.CORS_ALLOWED_ORIGINS ??= "http://127.0.0.1:3000";
  process.env.CDN_BASE_URL ??= "https://cdn.verify.local";
  process.env.STORAGE_SIGNING_SECRET ??= "verify-storage-secret";
  process.env.JWT_PRIVATE_KEY_BASE64 ??= Buffer.from(privateKey).toString("base64");
  process.env.JWT_PUBLIC_KEY_BASE64 ??= Buffer.from(publicKey).toString("base64");
  process.env.MFA_ENCRYPTION_KEY_BASE64 ??= randomBytes(32).toString("base64");
  process.env.SENTRY_ENABLED = "true";
  process.env.SENTRY_DSN = `http://public@127.0.0.1:${receiver.port}/42`;
  process.env.SENTRY_ENVIRONMENT = "verify";
  process.env.SENTRY_RELEASE = "verify";
  process.env.SENTRY_FLUSH_TIMEOUT_MS = "5000";

  try {
    const { captureException, initializeErrorReporting, shutdownErrorReporting } = await import("../src/lib/errorReporting");

    initializeErrorReporting("verify");
    captureException(new Error(message), {
      component: "verify",
      tags: {
        phase: "phase2"
      },
      extra: {
        verification: true
      }
    });
    await shutdownErrorReporting();

    assert(receiver.requests.length > 0, "No Sentry envelope was delivered");
    assert(receiver.requests.some((request) => request.method === "POST"), "Sentry verification did not issue a POST request");
    assert(
      receiver.requests.some((request) => request.url.includes("/api/42/envelope/")),
      "Sentry verification did not hit the expected envelope endpoint"
    );
    assert(receiver.requests.some((request) => request.body.includes(message)), "Sentry envelope did not contain the expected error payload");

    console.log(`Error reporting verification passed; delivered ${receiver.requests.length} envelope request(s)`);
  } finally {
    await closeServer(receiver.server);
  }
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
