import { runSmokeTest } from "./smoke-test";

const baseUrl = process.env.RELEASE_GATE_BASE_URL ?? process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const gatewayBaseUrl = process.env.RELEASE_GATE_GATEWAY_URL;
const internalApiKey = process.env.INTERNAL_API_KEY;

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

const buildInternalHeaders = (): HeadersInit => {
  if (!internalApiKey) {
    return {};
  }

  return {
    "x-internal-key": internalApiKey
  };
};

const runApiMetricsCheck = async (): Promise<void> => {
  const response = await fetchText(`${baseUrl}/api/v1/internal/metrics`, {
    headers: buildInternalHeaders()
  });

  assert(response.status === 200, `metrics failed: ${response.status}`);
  assert(response.headers.get("content-type")?.includes("text/plain") ?? false, "metrics did not return text/plain");
  assert(response.body.includes("vsp_http_requests_total"), "metrics missing vsp_http_requests_total");
  assert(response.body.includes("vsp_app_readiness"), "metrics missing vsp_app_readiness");
  assert(response.body.includes("vsp_bullmq_queue_jobs"), "metrics missing vsp_bullmq_queue_jobs");
};

const runGatewayMetricsCheck = async (): Promise<void> => {
  if (!gatewayBaseUrl) {
    return;
  }

  const health = await fetchText(`${gatewayBaseUrl}/health`);
  assert(health.status === 200, `gateway health failed: ${health.status}`);

  const metrics = await fetchText(`${gatewayBaseUrl}/metrics`, {
    headers: buildInternalHeaders()
  });

  assert(metrics.status === 200, `gateway metrics failed: ${metrics.status}`);
  assert(metrics.body.includes("vsp_ws_active_connections"), "gateway metrics missing vsp_ws_active_connections");
};

const main = async (): Promise<void> => {
  await runApiMetricsCheck();
  await runSmokeTest({ baseUrl });
  await runGatewayMetricsCheck();
  console.log(`Release gate passed against ${baseUrl}${gatewayBaseUrl ? ` and ${gatewayBaseUrl}` : ""}`);
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
