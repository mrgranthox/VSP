import { type NextFunction, type Request, type Response } from "express";

import { beginHttpRequest, buildRouteLabel, recordHttpRequest } from "../lib/metrics";

const httpMetrics = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = process.hrtime.bigint();
  let finalized = false;

  beginHttpRequest();

  const finalize = () => {
    if (finalized) {
      return;
    }

    finalized = true;
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

    recordHttpRequest({
      method: req.method,
      route: buildRouteLabel(req),
      statusCode: res.statusCode,
      durationSeconds
    });
  };

  res.on("finish", finalize);
  res.on("close", finalize);
  next();
};

export { httpMetrics };
