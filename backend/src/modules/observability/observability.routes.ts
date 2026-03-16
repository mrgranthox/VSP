import { Router, type Request, type Response } from "express";

import { getMetricsContentType, renderMetrics, setReadinessState } from "../../lib/metrics";
import { runApiReadinessChecks } from "../../lib/readiness";
import { internalAccess } from "../../lib/internalAccess";

const observabilityRoutes = Router();

observabilityRoutes.get("/internal/metrics", internalAccess, async (_req: Request, res: Response) => {
  const readiness = await runApiReadinessChecks();
  setReadinessState("api_database", readiness.checks.database);
  setReadinessState("api_redis", readiness.checks.redis);
  setReadinessState("api_runtime", true);

  res.setHeader("Content-Type", getMetricsContentType());
  res.status(200).send(await renderMetrics({ includeQueueMetrics: true }));
});

export { observabilityRoutes };
