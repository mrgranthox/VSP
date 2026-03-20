import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import fs from "node:fs";
import path from "node:path";

import { runReleaseGate } from "./release-gate";

interface TraceRequest {
  headers: IncomingHttpHeaders;
  body: string;
  payload: unknown;
}

interface ParsedSpan {
  name: string;
  attributes: Record<string, unknown>;
}

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

const getAvailablePort = async (): Promise<number> => {
  const probe = createServer();

  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = probe.address();
  assert(address && typeof address !== "string", "Failed to allocate a local TCP port");
  const port = (address as AddressInfo).port;
  await closeServer(probe);
  return port;
};

const startCollector = async () => {
  const requests: TraceRequest[] = [];
  const collector = createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/traces") {
      res.writeHead(404);
      res.end();
      return;
    }

    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      let payload: unknown = null;

      try {
        payload = JSON.parse(body);
      } catch {
        payload = null;
      }

      requests.push({
        headers: req.headers,
        body,
        payload
      });

      res.writeHead(200, {
        "content-type": "application/json"
      });
      res.end("{}");
    });
  });

  await new Promise<void>((resolve, reject) => {
    collector.once("error", reject);
    collector.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = collector.address();
  assert(address && typeof address !== "string", "Tracing collector did not expose a TCP port");

  return {
    collector,
    port: (address as AddressInfo).port,
    requests
  };
};

const decodeAttributeValue = (value: unknown): unknown => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if ("stringValue" in value) {
    return value.stringValue;
  }

  if ("boolValue" in value) {
    return value.boolValue;
  }

  if ("intValue" in value) {
    return Number(value.intValue);
  }

  if ("doubleValue" in value) {
    return value.doubleValue;
  }

  if ("arrayValue" in value && value.arrayValue && typeof value.arrayValue === "object" && "values" in value.arrayValue) {
    const values = value.arrayValue.values;

    if (Array.isArray(values)) {
      return values.map((entry) => decodeAttributeValue(entry));
    }
  }

  return undefined;
};

const extractSpans = (requests: TraceRequest[]): ParsedSpan[] => {
  const spans: ParsedSpan[] = [];

  for (const request of requests) {
    if (!request.payload || typeof request.payload !== "object" || !("resourceSpans" in request.payload)) {
      continue;
    }

    const resourceSpans = request.payload.resourceSpans;

    if (!Array.isArray(resourceSpans)) {
      continue;
    }

    for (const resourceSpan of resourceSpans) {
      if (!resourceSpan || typeof resourceSpan !== "object" || !("scopeSpans" in resourceSpan)) {
        continue;
      }

      const scopeSpans = resourceSpan.scopeSpans;

      if (!Array.isArray(scopeSpans)) {
        continue;
      }

      for (const scopeSpan of scopeSpans) {
        if (!scopeSpan || typeof scopeSpan !== "object" || !("spans" in scopeSpan)) {
          continue;
        }

        const scopeEntries = scopeSpan.spans;

        if (!Array.isArray(scopeEntries)) {
          continue;
        }

        for (const span of scopeEntries) {
          if (!span || typeof span !== "object" || typeof span.name !== "string") {
            continue;
          }

          const attributes: Record<string, unknown> = {};
          const attributeEntries = Array.isArray(span.attributes) ? span.attributes : [];

          for (const entry of attributeEntries) {
            if (!entry || typeof entry !== "object" || typeof entry.key !== "string") {
              continue;
            }

            attributes[entry.key] = decodeAttributeValue(entry.value);
          }

          spans.push({
            name: span.name,
            attributes
          });
        }
      }
    }
  }

  return spans;
};

const startApiServer = (port: number, collectorPort: number, internalApiKey: string, baseUrl: string) => {
  const entrypoint = path.resolve(process.cwd(), "dist/src/bootstrap/api.js");
  assert(fs.existsSync(entrypoint), "Tracing verification requires a built API bundle. Run npm run build first.");

  let output = "";

  const processHandle = spawn(process.execPath, [entrypoint], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(port),
      APP_BASE_URL: baseUrl,
      CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS ?? baseUrl,
      CDN_BASE_URL: process.env.CDN_BASE_URL ?? "https://cdn.trace-verify.local",
      STORAGE_SIGNING_SECRET: process.env.STORAGE_SIGNING_SECRET ?? "trace-verify-storage-secret",
      INTERNAL_API_KEY: internalApiKey,
      TRACING_ENABLED: "true",
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: `http://127.0.0.1:${collectorPort}/v1/traces`,
      OTEL_CONSOLE_EXPORTER_ENABLED: "false",
      OTEL_TRACES_SAMPLER_RATIO: "1",
      BACKGROUND_WORKERS_ENABLED: "false",
      RATE_LIMIT_ENABLED: "false",
      LOG_LEVEL: process.env.LOG_LEVEL ?? "warn"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const appendOutput = (chunk: Buffer | string) => {
    output += chunk.toString();

    if (output.length > 20_000) {
      output = output.slice(-20_000);
    }
  };

  processHandle.stdout?.on("data", appendOutput);
  processHandle.stderr?.on("data", appendOutput);

  return {
    processHandle,
    getOutput: () => output
  };
};

const waitForReady = async (baseUrl: string, getOutput: () => string, processHandle: ReturnType<typeof startApiServer>["processHandle"]): Promise<void> => {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Tracing verification server exited early.\n${getOutput()}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/v1/health/ready`);

      if (response.status === 200) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await sleep(500);
  }

  throw new Error(`Tracing verification server did not become ready.\n${getOutput()}`);
};

const stopProcess = async (processHandle: ReturnType<typeof startApiServer>["processHandle"]): Promise<void> => {
  if (processHandle.exitCode !== null) {
    return;
  }

  processHandle.kill("SIGTERM");

  const deadline = Date.now() + 10_000;

  while (processHandle.exitCode === null && Date.now() < deadline) {
    await sleep(100);
  }

  if (processHandle.exitCode === null) {
    processHandle.kill("SIGKILL");
  }
};

const waitForExport = async (requests: TraceRequest[], getOutput: () => string): Promise<ParsedSpan[]> => {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const spans = extractSpans(requests);
    const foundExpectedSpan = spans.some(
      (span) => span.name === "eventbus.emit" && span.attributes["vsp.event.name"] === "USER_REGISTERED"
    );

    if (requests.length > 0 && foundExpectedSpan) {
      return spans;
    }

    await sleep(250);
  }

  const payloadSummary = requests.map((request) => request.body.slice(0, 500)).join("\n---\n");
  throw new Error(
    `Tracing exporter did not deliver the expected USER_REGISTERED span.\nRequests received: ${requests.length}\n${payloadSummary}\n${getOutput()}`
  );
};

const main = async (): Promise<void> => {
  const collectorState = await startCollector();
  const apiPort = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${apiPort}`;
  const internalApiKey = `trace-verify-${randomUUID()}`;
  const runtime = startApiServer(apiPort, collectorState.port, internalApiKey, baseUrl);

  try {
    await waitForReady(baseUrl, runtime.getOutput, runtime.processHandle);
    await runReleaseGate({
      baseUrl,
      internalApiKey
    });
  } finally {
    await stopProcess(runtime.processHandle);
  }

  try {
    const spans = await waitForExport(collectorState.requests, runtime.getOutput);
    const contentTypes = collectorState.requests.map((request) => request.headers["content-type"]).filter(Boolean);

    assert(
      contentTypes.some((value) => typeof value === "string" && value.includes("application/json")),
      "Tracing exporter did not send JSON payloads"
    );

    console.log(
      `Tracing verification passed against ${baseUrl}; exported ${spans.length} spans across ${collectorState.requests.length} request(s)`
    );
  } finally {
    await closeServer(collectorState.collector);
  }
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
