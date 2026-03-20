import { type NextFunction, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { createRequestContext, runWithRequestContext } from "../lib/requestContext";

const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const existingRequestId = req.headers["x-request-id"];
  const requestIdValue = typeof existingRequestId === "string" ? existingRequestId : uuidv4();
  const requestContext = createRequestContext(req.headers, requestIdValue);

  req.headers["x-request-id"] = requestIdValue;
  req.headers.traceparent = requestContext.traceparent;
  req.requestContext = requestContext;

  res.setHeader("X-Request-ID", requestIdValue);
  res.setHeader("X-Trace-ID", requestContext.traceId);
  res.setHeader("Traceparent", requestContext.traceparent);

  runWithRequestContext(requestContext, next);
};

export { requestId };
