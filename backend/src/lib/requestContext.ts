import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

import { getActiveTraceContext } from "./tracing";
import type { RequestContext } from "../types/request-context";

interface ParsedTraceparent {
  traceId: string;
  parentSpanId: string;
  traceFlags: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

const traceparentPattern = /^[0-9a-f]{2}-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

const getHeaderValue = (headers: IncomingHttpHeaders, key: string): string | undefined => {
  const value = headers[key];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
};

const isZeroHex = (value: string): boolean => /^0+$/.test(value);

const generateTraceId = (): string => randomBytes(16).toString("hex");

const generateSpanId = (): string => randomBytes(8).toString("hex");

const parseTraceparent = (headers: IncomingHttpHeaders): ParsedTraceparent | null => {
  const traceparent = getHeaderValue(headers, "traceparent")?.trim().toLowerCase();

  if (!traceparent) {
    return null;
  }

  const match = traceparentPattern.exec(traceparent);

  if (!match) {
    return null;
  }

  const [, traceId, parentSpanId, traceFlags] = match;

  if (isZeroHex(traceId) || isZeroHex(parentSpanId)) {
    return null;
  }

  return {
    traceId,
    parentSpanId,
    traceFlags
  };
};

const createRequestContext = (headers: IncomingHttpHeaders, requestId: string): RequestContext => {
  const activeTraceContext = getActiveTraceContext();
  const parsedTraceparent = parseTraceparent(headers);

  if (activeTraceContext) {
    return {
      requestId,
      traceId: activeTraceContext.traceId,
      spanId: activeTraceContext.spanId,
      traceFlags: activeTraceContext.traceFlags,
      parentSpanId: parsedTraceparent?.parentSpanId,
      traceparent: activeTraceContext.traceparent
    };
  }

  const traceId = parsedTraceparent?.traceId ?? generateTraceId();
  const spanId = generateSpanId();
  const traceFlags = parsedTraceparent?.traceFlags ?? "01";

  return {
    requestId,
    traceId,
    spanId,
    traceFlags,
    parentSpanId: parsedTraceparent?.parentSpanId,
    traceparent: `00-${traceId}-${spanId}-${traceFlags}`
  };
};

const runWithRequestContext = <T>(context: RequestContext, callback: () => T): T => requestContextStorage.run(context, callback);

const getRequestContext = (): RequestContext | undefined => requestContextStorage.getStore();

export { createRequestContext, generateTraceId, getRequestContext, runWithRequestContext };
