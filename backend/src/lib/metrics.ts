import { Queue } from "bullmq";
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";

import { getBullMqConnectionOptions, getBullMqPrefix } from "./redis";

const registry = new Registry();

collectDefaultMetrics({
  register: registry,
  prefix: "vsp_"
});

const httpRequestsInFlight = new Gauge({
  name: "vsp_http_requests_in_flight",
  help: "Active HTTP requests currently being processed",
  registers: [registry]
});

const httpRequestsTotal = new Counter({
  name: "vsp_http_requests_total",
  help: "Total HTTP requests handled by the API",
  labelNames: ["method", "route", "status_class"] as const,
  registers: [registry]
});

const httpRequestDurationSeconds = new Histogram({
  name: "vsp_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_class"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry]
});

const appReadinessGauge = new Gauge({
  name: "vsp_app_readiness",
  help: "Readiness state for key backend components",
  labelNames: ["component"] as const,
  registers: [registry]
});

const dependencyChecksTotal = new Counter({
  name: "vsp_dependency_checks_total",
  help: "Dependency checks executed by the backend readiness path",
  labelNames: ["dependency", "result"] as const,
  registers: [registry]
});

const dependencyCheckDurationSeconds = new Histogram({
  name: "vsp_dependency_check_duration_seconds",
  help: "Dependency check duration in seconds",
  labelNames: ["dependency", "result"] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry]
});

const backgroundJobsTotal = new Counter({
  name: "vsp_background_jobs_total",
  help: "Background jobs handled by BullMQ workers",
  labelNames: ["queue", "job_name", "result"] as const,
  registers: [registry]
});

const backgroundJobDurationSeconds = new Histogram({
  name: "vsp_background_job_duration_seconds",
  help: "Background job duration in seconds when timing metadata is available",
  labelNames: ["queue", "job_name", "result"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [registry]
});

const queueJobsGauge = new Gauge({
  name: "vsp_bullmq_queue_jobs",
  help: "BullMQ job counts by queue and state",
  labelNames: ["queue", "state"] as const,
  registers: [registry]
});

const websocketActiveConnectionsGauge = new Gauge({
  name: "vsp_ws_active_connections",
  help: "Active websocket connections in the current gateway runtime",
  registers: [registry]
});

const websocketMessagesTotal = new Counter({
  name: "vsp_ws_messages_total",
  help: "Websocket messages and events processed by the gateway",
  labelNames: ["event", "result"] as const,
  registers: [registry]
});

const metricsCollectionFailuresTotal = new Counter({
  name: "vsp_metrics_collection_failures_total",
  help: "Metric collection failures grouped by collector",
  labelNames: ["collector"] as const,
  registers: [registry]
});

const operationalAlertsTotal = new Counter({
  name: "vsp_operational_alerts_total",
  help: "Operational alert attempts grouped by component, severity, and result",
  labelNames: ["component", "severity", "result"] as const,
  registers: [registry]
});

const operationalAlertDeliveryDurationSeconds = new Histogram({
  name: "vsp_operational_alert_delivery_duration_seconds",
  help: "Operational alert delivery duration in seconds for alert attempts",
  labelNames: ["component", "severity", "result"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry]
});

const queueStates = ["waiting", "active", "completed", "failed", "delayed", "paused"] as const;
const queueNames = ["notifications", "analytics", "search", "billing", "moderation", "media", "media-video", "maintenance"] as const;

const getMetricsContentType = (): string => registry.contentType;

const sanitizeFallbackRoute = (value: string): string => {
  const sanitized = value
    .split("?")[0]
    .split("/")
    .map((segment) => {
      if (!segment) {
        return "";
      }

      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) {
        return ":id";
      }

      if (/^\d+$/.test(segment)) {
        return ":id";
      }

      if (/^[A-Za-z0-9_-]{24,}$/.test(segment)) {
        return ":id";
      }

      return segment;
    })
    .join("/");

  return sanitized || "/";
};

const buildRouteLabel = (req: { baseUrl?: string; route?: { path?: string | string[] }; originalUrl?: string; path?: string }): string => {
  const routePath = req.route?.path;

  if (typeof routePath === "string") {
    return `${req.baseUrl ?? ""}${routePath}` || "/";
  }

  if (Array.isArray(routePath)) {
    return `${req.baseUrl ?? ""}${routePath[0]}` || "/";
  }

  return sanitizeFallbackRoute(req.path ?? req.originalUrl ?? "unmatched");
};

const getStatusClass = (statusCode: number): string => `${Math.floor(statusCode / 100)}xx`;

const beginHttpRequest = (): void => {
  httpRequestsInFlight.inc();
};

const recordHttpRequest = (input: { method: string; route: string; statusCode: number; durationSeconds: number }): void => {
  const labels = {
    method: input.method.toUpperCase(),
    route: input.route,
    status_class: getStatusClass(input.statusCode)
  } as const;

  httpRequestsInFlight.dec();
  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, input.durationSeconds);
};

const setReadinessState = (component: string, ready: boolean): void => {
  appReadinessGauge.set({ component }, ready ? 1 : 0);
};

const recordDependencyCheck = (input: {
  dependency: string;
  result: "success" | "failure";
  durationSeconds: number;
}): void => {
  const labels = {
    dependency: input.dependency,
    result: input.result
  } as const;

  dependencyChecksTotal.inc(labels);

  if (Number.isFinite(input.durationSeconds) && input.durationSeconds >= 0) {
    dependencyCheckDurationSeconds.observe(labels, input.durationSeconds);
  }
};

const recordBackgroundJobResult = (input: { queue: string; jobName: string; result: "completed" | "failed"; durationSeconds?: number }): void => {
  const labels = {
    queue: input.queue,
    job_name: input.jobName,
    result: input.result
  } as const;

  backgroundJobsTotal.inc(labels);

  if (typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds) && input.durationSeconds >= 0) {
    backgroundJobDurationSeconds.observe(labels, input.durationSeconds);
  }
};

const recordWebsocketConnectionOpened = (): void => {
  websocketActiveConnectionsGauge.inc();
};

const recordWebsocketConnectionClosed = (): void => {
  websocketActiveConnectionsGauge.dec();
};

const recordWebsocketEvent = (event: string, result: "accepted" | "rejected" | "error"): void => {
  websocketMessagesTotal.inc({
    event,
    result
  });
};

const recordOperationalAlertResult = (input: {
  component: string;
  severity: "warning" | "critical";
  result: "delivered" | "disabled" | "no_webhook" | "delivery_failed" | "delivery_error";
  durationSeconds?: number;
}): void => {
  const labels = {
    component: input.component,
    severity: input.severity,
    result: input.result
  } as const;

  operationalAlertsTotal.inc(labels);

  if (typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds) && input.durationSeconds >= 0) {
    operationalAlertDeliveryDurationSeconds.observe(labels, input.durationSeconds);
  }
};

const collectQueueMetrics = async (): Promise<void> => {
  const queues = queueNames.map(
    (queueName) =>
      new Queue(queueName, {
        connection: getBullMqConnectionOptions(),
        prefix: getBullMqPrefix()
      })
  );

  try {
    queueJobsGauge.reset();

    await Promise.all(
      queues.map(async (queue) => {
        const counts = await queue.getJobCounts(...queueStates);

        for (const state of queueStates) {
          queueJobsGauge.set(
            {
              queue: queue.name,
              state
            },
            counts[state] ?? 0
          );
        }
      })
    );
  } catch {
    metricsCollectionFailuresTotal.inc({
      collector: "bullmq_queues"
    });
  } finally {
    await Promise.allSettled(queues.map((queue) => queue.close()));
  }
};

const renderMetrics = async (options?: { includeQueueMetrics?: boolean }): Promise<string> => {
  if (options?.includeQueueMetrics !== false) {
    await collectQueueMetrics();
  }

  return registry.metrics();
};

export {
  beginHttpRequest,
  buildRouteLabel,
  getMetricsContentType,
  recordDependencyCheck,
  recordBackgroundJobResult,
  recordHttpRequest,
  recordOperationalAlertResult,
  recordWebsocketConnectionClosed,
  recordWebsocketConnectionOpened,
  recordWebsocketEvent,
  registry,
  renderMetrics,
  setReadinessState
};
