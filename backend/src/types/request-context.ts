interface RequestContext {
  requestId: string;
  traceId: string;
  spanId: string;
  traceFlags: string;
  traceparent: string;
  parentSpanId?: string;
}

declare global {
  namespace Express {
    interface Request {
      requestContext?: RequestContext;
    }
  }
}

export type { RequestContext };

export {};
