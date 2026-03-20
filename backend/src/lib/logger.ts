import pino from "pino";

import { env } from "../config/env";
import { getRequestContext } from "./requestContext";
import { getActiveTraceContext } from "./tracing";

const logger = pino({
  name: env.APP_NAME,
  level: env.LOG_LEVEL,
  mixin() {
    const requestContext = getRequestContext();
    const activeTraceContext = getActiveTraceContext();

    if (requestContext) {
      return {
        requestId: requestContext.requestId,
        traceId: requestContext.traceId,
        spanId: requestContext.spanId
      };
    }

    if (activeTraceContext) {
      return {
        traceId: activeTraceContext.traceId,
        spanId: activeTraceContext.spanId
      };
    }

    return {};
  }
});

export { logger };
