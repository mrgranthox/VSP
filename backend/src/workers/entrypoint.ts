import "../config/env";
import { sendOperationalAlert } from "../lib/alerts";
import { captureException, initializeErrorReporting, shutdownErrorReporting } from "../lib/errorReporting";
import { logger } from "../lib/logger";
import { registerFatalErrorHandlers } from "../lib/runtime";
import { shutdownTracing } from "../lib/tracing";
import { startBackgroundWorkers, stopBackgroundWorkers } from ".";

initializeErrorReporting("workers");
registerFatalErrorHandlers("workers");

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down background workers");
  await stopBackgroundWorkers();
  await shutdownErrorReporting();
  await shutdownTracing();
  process.exit(0);
};

void (async () => {
  await startBackgroundWorkers();
  logger.info("Background worker runtime is ready");
})().catch((error) => {
  captureException(error, {
    component: "workers",
    tags: {
      lifecycle: "startup"
    }
  });
  logger.error({ error }, "Failed to start background worker runtime");
  void sendOperationalAlert({
    severity: "critical",
    component: "workers",
    summary: "Background worker startup failed",
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
