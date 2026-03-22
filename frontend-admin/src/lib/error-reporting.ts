type ErrorSource =
  | "window.error"
  | "unhandledrejection"
  | "react.error-boundary"
  | "api.network"
  | "api.server";

interface ErrorReportContext {
  source: ErrorSource;
  componentStack?: string;
  status?: number;
  method?: string;
  path?: string;
  details?: Record<string, unknown>;
}

interface NormalizedError {
  name: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
}

interface AdminErrorPayload {
  app: string;
  release: string;
  source: ErrorSource;
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  status?: number;
  method?: string;
  path?: string;
  details?: Record<string, unknown>;
  href: string;
  pathname: string;
  userAgent: string;
  timestamp: string;
}

const endpoint = import.meta.env.VITE_ERROR_REPORTING_ENDPOINT;
const enabled = (import.meta.env.VITE_ERROR_REPORTING_ENABLED ?? "true") !== "false" && typeof endpoint === "string" && endpoint.length > 0;
const dedupeWindowMs = 5_000;
const recentReports = new Map<string, number>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeError = (error: unknown): NormalizedError => {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown error",
      stack: error.stack
    };
  }

  if (typeof error === "string") {
    return {
      name: "Error",
      message: error
    };
  }

  if (isRecord(error)) {
    return {
      name: typeof error.name === "string" ? error.name : "Error",
      message: typeof error.message === "string" ? error.message : JSON.stringify(error),
      details: error
    };
  }

  return {
    name: "Error",
    message: "Unknown error"
  };
};

const shouldSendReport = (payload: AdminErrorPayload) => {
  const key = [payload.source, payload.name, payload.message, payload.path ?? "", payload.status ?? ""].join("|");
  const now = Date.now();
  const lastSentAt = recentReports.get(key);

  if (lastSentAt && now - lastSentAt < dedupeWindowMs) {
    return false;
  }

  recentReports.set(key, now);
  return true;
};

const sendPayload = (payload: AdminErrorPayload) => {
  if (!enabled || !endpoint) {
    return;
  }

  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  void fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body,
    keepalive: true
  }).catch(() => undefined);
};

const reportAdminError = (error: unknown, context: ErrorReportContext) => {
  if (!enabled || typeof window === "undefined") {
    return;
  }

  const normalized = normalizeError(error);
  const payload: AdminErrorPayload = {
    app: import.meta.env.VITE_APP_NAME ?? "VSP Admin",
    release: import.meta.env.VITE_APP_RELEASE ?? "local",
    source: context.source,
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
    componentStack: context.componentStack,
    status: context.status,
    method: context.method,
    path: context.path,
    details: {
      ...normalized.details,
      ...context.details
    },
    href: window.location.href,
    pathname: window.location.pathname,
    userAgent: window.navigator.userAgent,
    timestamp: new Date().toISOString()
  };

  if (!shouldSendReport(payload)) {
    return;
  }

  sendPayload(payload);
};

const installGlobalErrorReporting = () => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleWindowError = (event: ErrorEvent) => {
    reportAdminError(event.error ?? event.message, {
      source: "window.error",
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportAdminError(event.reason, {
      source: "unhandledrejection"
    });
  };

  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleWindowError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
};

export { installGlobalErrorReporting, reportAdminError };
