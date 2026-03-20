import fs from "node:fs";
import path from "node:path";

import { context, propagation, ROOT_CONTEXT, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { Attributes, Span, SpanOptions } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor, ConsoleSpanExporter, ParentBasedSampler, SimpleSpanProcessor, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_NAMESPACE, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

import { env } from "../config/env";

interface ActiveTraceContext {
  traceId: string;
  spanId: string;
  traceFlags: string;
  traceparent: string;
  tracestate?: string;
}

interface TraceCarrier {
  traceparent?: string;
  tracestate?: string;
  requestId?: string;
}

let sdk: NodeSDK | null = null;
let tracingInitialized = false;

const getServiceVersion = (): string => {
  try {
    const packageJsonPath = path.resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: string };
    return packageJson.version ?? "1.0.0";
  } catch {
    return "1.0.0";
  }
};

const parseHeaders = (value?: string): Record<string, string> | undefined => {
  if (!value?.trim()) {
    return undefined;
  }

  const pairs = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex <= 0) {
        return null;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const headerValue = entry.slice(separatorIndex + 1).trim();

      if (!key || !headerValue) {
        return null;
      }

      return [key, headerValue] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return pairs.length > 0 ? Object.fromEntries(pairs) : undefined;
};

const buildSpanProcessors = () => {
  const spanProcessors = [];

  if (env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    spanProcessors.push(
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
          headers: parseHeaders(env.OTEL_EXPORTER_OTLP_HEADERS)
        })
      )
    );
  }

  if (env.OTEL_CONSOLE_EXPORTER_ENABLED) {
    spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  return spanProcessors;
};

const initializeTracing = async (component: "api" | "workers" | "gateway"): Promise<void> => {
  if (tracingInitialized || !env.TRACING_ENABLED || env.NODE_ENV === "test") {
    return;
  }

  const spanProcessors = buildSpanProcessors();

  if (spanProcessors.length === 0) {
    return;
  }

  sdk = new NodeSDK({
    autoDetectResources: false,
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: env.APP_NAME,
      [ATTR_SERVICE_NAMESPACE]: "vsp",
      [ATTR_SERVICE_VERSION]: getServiceVersion(),
      "deployment.environment": env.NODE_ENV,
      "service.instance.id": `${component}-${process.pid}`,
      "vsp.runtime.component": component
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(env.OTEL_TRACES_SAMPLER_RATIO)
    }),
    spanProcessors,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": {
          enabled: false
        }
      })
    ]
  });

  sdk.start();
  tracingInitialized = true;
};

const shutdownTracing = async (): Promise<void> => {
  if (!sdk) {
    tracingInitialized = false;
    return;
  }

  await sdk.shutdown();
  sdk = null;
  tracingInitialized = false;
};

const getActiveTraceContext = (): ActiveTraceContext | undefined => {
  const activeSpan = trace.getSpan(context.active());

  if (!activeSpan) {
    return undefined;
  }

  const spanContext = activeSpan.spanContext();
  const traceFlags = spanContext.traceFlags.toString(16).padStart(2, "0");

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags,
    traceparent: `00-${spanContext.traceId}-${spanContext.spanId}-${traceFlags}`,
    tracestate: spanContext.traceState?.serialize()
  };
};

const buildTraceCarrier = (requestId?: string): TraceCarrier | undefined => {
  const carrier: TraceCarrier = {};
  propagation.inject(context.active(), carrier);

  if (requestId) {
    carrier.requestId = requestId;
  }

  return Object.keys(carrier).length > 0 ? carrier : undefined;
};

const runWithExtractedTraceContext = async <T>(carrier: TraceCarrier | undefined, callback: () => Promise<T>): Promise<T> => {
  if (!carrier) {
    return callback();
  }

  const extractedContext = propagation.extract(ROOT_CONTEXT, carrier);
  return context.with(extractedContext, callback);
};

const withActiveSpan = async <T>(name: string, options: SpanOptions, handler: (span: Span) => Promise<T>): Promise<T> => {
  const tracer = trace.getTracer(env.APP_NAME, getServiceVersion());

  return tracer.startActiveSpan(name, options, async (span) => {
    try {
      const result = await handler(span);
      span.setStatus({
        code: SpanStatusCode.OK
      });
      return result;
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
      } else {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(error)
        });
      }

      throw error;
    } finally {
      span.end();
    }
  });
};

const setSpanAttributes = (span: Span, attributes: Attributes): void => {
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      span.setAttribute(key, value);
    }
  }
};

export {
  SpanKind,
  buildTraceCarrier,
  getActiveTraceContext,
  initializeTracing,
  runWithExtractedTraceContext,
  setSpanAttributes,
  shutdownTracing,
  withActiveSpan
};
export type { ActiveTraceContext, TraceCarrier };
