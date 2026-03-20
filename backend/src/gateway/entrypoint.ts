import { createServer } from "node:http";

import { env } from "../config/env";
import { Errors } from "../lib/errors";
import { captureException, initializeErrorReporting, shutdownErrorReporting } from "../lib/errorReporting";
import { getMetricsContentType, renderMetrics, setReadinessState } from "../lib/metrics";
import { sendOperationalAlert } from "../lib/alerts";
import { hasInternalAccess } from "../lib/internalAccess";
import { logger } from "../lib/logger";
import { registerFatalErrorHandlers } from "../lib/runtime";
import { shutdownTracing } from "../lib/tracing";
import { WebsocketGateway } from "./websocket";

const port = env.WS_GATEWAY_PORT;

initializeErrorReporting("gateway");
registerFatalErrorHandlers("gateway");

const server = createServer((req, res) => {
  void (async () => {
    if (req.url === "/health") {
      setReadinessState("gateway_runtime", true);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.url === "/metrics") {
      if (!hasInternalAccess(req.headers)) {
        const error = Errors.PERMISSION_DENIED();
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { code: error.code, message: error.message } }));
        return;
      }

      setReadinessState("gateway_runtime", true);
      res.writeHead(200, { "content-type": getMetricsContentType() });
      res.end(await renderMetrics({ includeQueueMetrics: false }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  })().catch((error) => {
    captureException(error, {
      component: "gateway",
      tags: {
        lifecycle: "http_handler",
        url: req.url ?? "unknown"
      }
    });
    logger.error({ error }, "Gateway HTTP handler failed");
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  });
});

const gateway = new WebsocketGateway(server);

const shutdown = async (signal: string): Promise<void> => {
  await gateway.close();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
  await shutdownErrorReporting();
  await shutdownTracing();
  logger.info({ signal }, "Websocket gateway shutdown completed");
  process.exit(0);
};

void (async () => {
  await gateway.start();
  server.listen(port, () => {
    logger.info({ port, path: env.WS_GATEWAY_PATH }, "Websocket gateway listening");
  });
})().catch((error) => {
  captureException(error, {
    component: "gateway",
    tags: {
      lifecycle: "startup"
    }
  });
  logger.error({ error }, "Failed to start websocket gateway");
  void sendOperationalAlert({
    severity: "critical",
    component: "gateway",
    summary: "Websocket gateway startup failed",
    details: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null
    }
  }).finally(() => {
    process.exit(1);
  });
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
