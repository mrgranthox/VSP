import { app } from "./app";
import { env } from "./config/env";
import { sendOperationalAlert } from "./lib/alerts";
import { captureException, initializeErrorReporting, shutdownErrorReporting } from "./lib/errorReporting";
import { logger } from "./lib/logger";
import { registerFatalErrorHandlers } from "./lib/runtime";
import { shutdownTracing } from "./lib/tracing";
import { startBackgroundWorkers, stopBackgroundWorkers } from "./workers";

const port = env.PORT;
const shouldStartBackgroundWorkers = env.BACKGROUND_WORKERS_ENABLED;

initializeErrorReporting("api");
registerFatalErrorHandlers("api");

const bootstrap = async (): Promise<void> => {
  if (shouldStartBackgroundWorkers) {
    await startBackgroundWorkers();
  }

  app.listen(port, () => {
    logger.info({ port, backgroundWorkers: shouldStartBackgroundWorkers }, "HTTP server listening");
  });
};

const shutdown = async (signal: string): Promise<void> => {
  if (shouldStartBackgroundWorkers) {
    await stopBackgroundWorkers();
  }

  await shutdownErrorReporting();
  await shutdownTracing();
  logger.info({ signal }, "Server shutdown completed");
  process.exit(0);
};

void bootstrap().catch((error) => {
  captureException(error, {
    component: "api",
    tags: {
      lifecycle: "startup"
    }
  });
  logger.error({ error }, "Failed to start HTTP server");
  void sendOperationalAlert({
    severity: "critical",
    component: "api",
    summary: "API startup failed",
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
