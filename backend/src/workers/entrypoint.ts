import "../config/env";
import { sendOperationalAlert } from "../lib/alerts";
import { logger } from "../lib/logger";
import { registerFatalErrorHandlers } from "../lib/runtime";
import { startBackgroundWorkers, stopBackgroundWorkers } from ".";

registerFatalErrorHandlers("workers");

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down background workers");
  await stopBackgroundWorkers();
  process.exit(0);
};

void (async () => {
  await startBackgroundWorkers();
  logger.info("Background worker runtime is ready");
})().catch((error) => {
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
