import { env } from "../config/env";
import { logger } from "./logger";
import { recordOperationalAlertResult } from "./metrics";

type OperationalAlertSeverity = "warning" | "critical";

interface OperationalAlertInput {
  severity: OperationalAlertSeverity;
  component: string;
  summary: string;
  details?: Record<string, unknown>;
}

interface OperationalAlertPayload extends OperationalAlertInput {
  app: string;
  environment: string;
  timestamp: string;
}

type AlertDeliveryResult =
  | { delivered: true }
  | { delivered: false; skipped: true; reason: "disabled" | "no_webhook" }
  | { delivered: false; skipped?: false; reason: "delivery_failed" | "delivery_error" };

const buildOperationalAlertPayload = (input: OperationalAlertInput): OperationalAlertPayload => ({
  app: env.APP_NAME,
  environment: env.NODE_ENV,
  timestamp: new Date().toISOString(),
  ...input
});

const sendOperationalAlert = async (input: OperationalAlertInput): Promise<AlertDeliveryResult> => {
  const payload = buildOperationalAlertPayload(input);

  if (!env.ALERTS_ENABLED) {
    recordOperationalAlertResult({
      component: payload.component,
      severity: payload.severity,
      result: "disabled"
    });

    return {
      delivered: false,
      skipped: true,
      reason: "disabled"
    };
  }

  if (!env.ALERT_WEBHOOK_URL) {
    logger.warn({ alert: payload }, "Operational alert raised without webhook destination");
    recordOperationalAlertResult({
      component: payload.component,
      severity: payload.severity,
      result: "no_webhook"
    });

    return {
      delivered: false,
      skipped: true,
      reason: "no_webhook"
    };
  }

  try {
    const startedAt = process.hrtime.bigint();
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (env.ALERT_WEBHOOK_BEARER_TOKEN) {
      headers.authorization = `Bearer ${env.ALERT_WEBHOOK_BEARER_TOKEN}`;
    }

    const response = await fetch(env.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(env.ALERT_WEBHOOK_TIMEOUT_MS)
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error(
        {
          alert: payload,
          statusCode: response.status,
          responseBody: body || undefined
        },
        "Operational alert delivery failed"
      );
      recordOperationalAlertResult({
        component: payload.component,
        severity: payload.severity,
        result: "delivery_failed",
        durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
      });
      return {
        delivered: false,
        reason: "delivery_failed"
      };
    }

    logger.info({ alert: payload }, "Operational alert delivered");
    recordOperationalAlertResult({
      component: payload.component,
      severity: payload.severity,
      result: "delivered",
      durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
    });
    return {
      delivered: true
    };
  } catch (error) {
    logger.error({ alert: payload, error }, "Operational alert delivery errored");
    recordOperationalAlertResult({
      component: payload.component,
      severity: payload.severity,
      result: "delivery_error"
    });
    return {
      delivered: false,
      reason: "delivery_error"
    };
  }
};

export { buildOperationalAlertPayload, sendOperationalAlert };
export type { OperationalAlertInput, OperationalAlertPayload, OperationalAlertSeverity };
