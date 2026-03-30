import { timingSafeEqual } from "node:crypto";
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

const getBearerToken = (headers: IncomingHttpHeaders): string | undefined => {
  const authorization = headers.authorization;
  const value = typeof authorization === "string" ? authorization : Array.isArray(authorization) ? authorization[0] : undefined;

  if (!value) {
    return undefined;
  }

  const [scheme, token] = value.trim().split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
};

const tokensMatch = (providedToken: string | undefined, expectedToken: string): boolean => {
  if (!providedToken) {
    return false;
  }

  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
};

const hasInternalAccess = (headers: IncomingHttpHeaders): boolean => {
  const expectedToken = env.INTERNAL_API_KEY;
  const providedToken = getInternalAccessToken(headers) ?? getBearerToken(headers);

  if (expectedToken) {
    return tokensMatch(providedToken, expectedToken);
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
