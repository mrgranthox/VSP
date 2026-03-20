import { type NextFunction, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { ZodError } from "zod";

import { ApiError } from "../lib/errors";
import { logger } from "../lib/logger";
import { error as errorResponse } from "../lib/response";

interface PrismaKnownRequestErrorShape {
  code: string;
  clientVersion: string;
}

const isPrismaKnownRequestError = (value: unknown): value is PrismaKnownRequestErrorShape => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return typeof (value as PrismaKnownRequestErrorShape).code === "string" && typeof (value as PrismaKnownRequestErrorShape).clientVersion === "string";
};

const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const requestIdValue = req.requestContext?.requestId ?? (typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : uuidv4());
  const traceIdValue = req.requestContext?.traceId;

  if (err instanceof ZodError) {
    res.status(422).json(errorResponse("VALIDATION_FAILED", "Validation failed", err.flatten(), { requestId: requestIdValue }));
    return;
  }

  if (err instanceof ApiError) {
    res
      .status(err.statusCode)
      .json(errorResponse(err.code, err.message, err.details, { requestId: requestIdValue }));
    return;
  }

  if (isPrismaKnownRequestError(err)) {
    if (err.code === "P2002") {
      res.status(409).json(errorResponse("CONFLICT", "Record already exists", null, { requestId: requestIdValue }));
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json(errorResponse("NOT_FOUND", "Record not found", null, { requestId: requestIdValue }));
      return;
    }
  }

  logger.error({ err, requestId: requestIdValue, traceId: traceIdValue }, "Unhandled error");
  res.status(500).json(errorResponse("INTERNAL_ERROR", "Internal server error", null, { requestId: requestIdValue }));
};

export { errorHandler };
