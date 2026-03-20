import fs from "node:fs";
import path from "node:path";

import * as Sentry from "@sentry/node";

import { env } from "../config/env";
import { logger } from "./logger";

interface ErrorCaptureContext {
  component?: string;
  requestId?: string;
  traceId?: string;
  userId?: string;
  tags?: Record<string, string | number | boolean | undefined>;
  extra?: Record<string, unknown>;
}

let initialized = false;
let activeComponent: string | null = null;

const isErrorReportingEnabled = (): boolean => env.SENTRY_ENABLED && Boolean(env.SENTRY_DSN);

const getServiceVersion = (): string => {
  try {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: string };
    return env.SENTRY_RELEASE ?? packageJson.version ?? "1.0.0";
  } catch {
    return env.SENTRY_RELEASE ?? "1.0.0";
  }
};

const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }

  return new Error(typeof value === "string" ? value : JSON.stringify(value));
};

const initializeErrorReporting = (component: string): void => {
  if (initialized || !isErrorReportingEnabled()) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    enabled: true,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: getServiceVersion(),
    serverName: `${env.APP_NAME}-${component}`,
    sendDefaultPii: false
  });

  Sentry.setTag("vsp.app", env.APP_NAME);
  Sentry.setTag("vsp.component", component);
  initialized = true;
  activeComponent = component;
  logger.info({ component }, "Error reporting initialized");
};

const captureException = (value: unknown, context: ErrorCaptureContext = {}): void => {
  if (!initialized || !isErrorReportingEnabled()) {
    return;
  }

  const error = toError(value);

  Sentry.withScope((scope) => {
    const component = context.component ?? activeComponent ?? undefined;

    if (component) {
      scope.setTag("vsp.component", component);
    }

    if (context.requestId) {
      scope.setTag("request_id", context.requestId);
    }

    if (context.traceId) {
      scope.setTag("trace_id", context.traceId);
    }

    if (context.userId) {
      scope.setUser({
        id: context.userId
      });
    }

    for (const [key, value] of Object.entries(context.tags ?? {})) {
      if (value !== undefined) {
        scope.setTag(key, String(value));
      }
    }

    if (context.extra) {
      scope.setContext("details", context.extra);
    }

    Sentry.captureException(error);
  });
};

const flushErrorReporting = async (): Promise<boolean> => {
  if (!initialized || !isErrorReportingEnabled()) {
    return true;
  }

  return Sentry.flush(env.SENTRY_FLUSH_TIMEOUT_MS);
};

const shutdownErrorReporting = async (): Promise<boolean> => {
  if (!initialized || !isErrorReportingEnabled()) {
    initialized = false;
    activeComponent = null;
    return true;
  }

  const result = await Sentry.close(env.SENTRY_FLUSH_TIMEOUT_MS);
  initialized = false;
  activeComponent = null;
  return result;
};

export { captureException, flushErrorReporting, initializeErrorReporting, shutdownErrorReporting };
export type { ErrorCaptureContext };
