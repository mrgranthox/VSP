import type { IncomingHttpHeaders } from "node:http";

import { type NextFunction, type Request, type Response } from "express";

import { env } from "../config/env";
import { Errors } from "./errors";

const getInternalAccessToken = (headers: IncomingHttpHeaders): string | undefined => {
  const value = headers["x-internal-key"];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
};

const hasInternalAccess = (headers: IncomingHttpHeaders): boolean => {
  const expectedToken = env.INTERNAL_API_KEY;
  const providedToken = getInternalAccessToken(headers);

  if (expectedToken) {
    return providedToken === expectedToken;
  }

  return env.NODE_ENV !== "production";
};

const requireInternalAccess = (headers: IncomingHttpHeaders): void => {
  if (!hasInternalAccess(headers)) {
    throw Errors.PERMISSION_DENIED();
  }
};

const internalAccess = (req: Request, _res: Response, next: NextFunction): void => {
  requireInternalAccess(req.headers);
  next();
};

export { hasInternalAccess, internalAccess, requireInternalAccess };
