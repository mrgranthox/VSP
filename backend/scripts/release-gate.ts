import { runSmokeTest } from "./smoke-test";

interface ReleaseGateOptions {
  baseUrl?: string;
  gatewayBaseUrl?: string;
  adminBaseUrl?: string;
  internalApiKey?: string;
}

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const fetchText = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const body = await response.text();

  return {
    status: response.status,
    headers: response.headers,
    body
  };
};

const buildInternalHeaders = (internalApiKey?: string): HeadersInit => {
  if (!internalApiKey) {
    return {};
  }

  return {
    "x-internal-key": internalApiKey
  };
};

const runApiMetricsCheck = async (baseUrl: string, internalApiKey?: string): Promise<void> => {
  const response = await fetchText(`${baseUrl}/api/v1/internal/metrics`, {
    headers: buildInternalHeaders(internalApiKey)
  });

  assert(response.status === 200, `metrics failed: ${response.status}`);
  assert(response.headers.get("content-type")?.includes("text/plain") ?? false, "metrics did not return text/plain");
  assert(response.body.includes("vsp_http_requests_total"), "metrics missing vsp_http_requests_total");
  assert(response.body.includes("vsp_app_readiness"), "metrics missing vsp_app_readiness");
  assert(response.body.includes("vsp_bullmq_queue_jobs"), "metrics missing vsp_bullmq_queue_jobs");
};

const runGatewayMetricsCheck = async (gatewayBaseUrl?: string, internalApiKey?: string): Promise<void> => {
  if (!gatewayBaseUrl) {
    return;
  }

  const health = await fetchText(`${gatewayBaseUrl}/health`);
  assert(health.status === 200, `gateway health failed: ${health.status}`);

  const metrics = await fetchText(`${gatewayBaseUrl}/metrics`, {
    headers: buildInternalHeaders(internalApiKey)
  });

  assert(metrics.status === 200, `gateway metrics failed: ${metrics.status}`);
  assert(metrics.body.includes("vsp_ws_active_connections"), "gateway metrics missing vsp_ws_active_connections");
};

const runAdminCheck = async (adminBaseUrl?: string): Promise<void> => {
  if (!adminBaseUrl) {
    return;
  }

  const health = await fetchText(`${adminBaseUrl}/healthz`);
  assert(health.status === 200, `admin health failed: ${health.status}`);
  assert(health.body.trim() === "ok", "admin health body mismatch");

  const root = await fetchText(adminBaseUrl);
  assert(root.status === 200, `admin root failed: ${root.status}`);
  assert(root.headers.get("content-type")?.includes("text/html") ?? false, "admin root did not return html");
  assert(root.body.includes("<title>VSP Admin</title>"), "admin root missing expected title");
};

const runReleaseGate = async (options: ReleaseGateOptions = {}): Promise<void> => {
  const baseUrl = options.baseUrl ?? process.env.RELEASE_GATE_BASE_URL ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
  const gatewayBaseUrl = options.gatewayBaseUrl ?? process.env.RELEASE_GATE_GATEWAY_URL;
  const adminBaseUrl = options.adminBaseUrl ?? process.env.RELEASE_GATE_ADMIN_URL;
  const internalApiKey = options.internalApiKey ?? process.env.INTERNAL_API_KEY;

  await runApiMetricsCheck(baseUrl, internalApiKey);
  await runSmokeTest({ baseUrl });
  await runGatewayMetricsCheck(gatewayBaseUrl, internalApiKey);
  await runAdminCheck(adminBaseUrl);
  console.log(
    `Release gate passed against ${[baseUrl, gatewayBaseUrl, adminBaseUrl].filter(Boolean).join(" and ")}`
  );
};

if (require.main === module) {
  void runReleaseGate().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { runReleaseGate };
