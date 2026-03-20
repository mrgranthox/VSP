import { generateTraceId, getRequestContext } from "./requestContext";
import { v4 as uuidv4 } from "uuid";

interface ResponseMeta {
  requestId?: string;
  traceId?: string;
  [key: string]: unknown;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

const buildMeta = (meta?: ResponseMeta) => {
  const requestContext = getRequestContext();
  const { requestId, traceId, ...rest } = meta ?? {};

  return {
    requestId: requestId ?? requestContext?.requestId ?? uuidv4(),
    traceId: traceId ?? requestContext?.traceId ?? generateTraceId(),
    timestamp: new Date().toISOString(),
    ...rest
  };
};

const success = (data: unknown, meta?: ResponseMeta) => ({
  success: true,
  data,
  meta: buildMeta(meta)
});

const paginated = (data: unknown[], pagination: Pagination, meta?: ResponseMeta) => ({
  success: true,
  data,
  pagination,
  meta: buildMeta(meta)
});

const error = (code: string, message: string, details?: unknown, meta?: ResponseMeta) => ({
  success: false,
  error: { code, message, details },
  meta: buildMeta(meta)
});

export { error, paginated, success };
export type { Pagination, ResponseMeta };
