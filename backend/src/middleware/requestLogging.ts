import { type NextFunction, type Request, type Response } from "express";

import { logger } from "../lib/logger";
import { buildRouteLabel } from "../lib/metrics";

const lowNoiseRoutes = new Set(["/api/v1/health", "/api/v1/health/ready", "/api/v1/internal/metrics"]);

const requestLogging = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = process.hrtime.bigint();
  let finalized = false;

  const finalize = () => {
    if (finalized) {
      return;
    }

    finalized = true;

    const route = buildRouteLabel(req);
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const payload = {
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs,
      actorUserId: req.actor?.userId
    };

    if (lowNoiseRoutes.has(route)) {
      logger.debug(payload, "HTTP request completed");
      return;
    }

    if (res.statusCode >= 500) {
      logger.error(payload, "HTTP request completed with server error");
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(payload, "HTTP request completed with client error");
      return;
    }

    logger.info(payload, "HTTP request completed");
  };

  res.on("finish", finalize);
  res.on("close", finalize);
  next();
};

export { requestLogging };
