import { Router } from "express";

import { internalAccess } from "../../lib/internalAccess";
import { validate } from "../../middleware/validate";
import { analyticsController } from "./analytics.controller";
import { BatchAnalyticsEventsBody, TriggerJobBody } from "./analytics.schemas";

const analyticsRoutes = Router();

analyticsRoutes.post("/internal/analytics/events", internalAccess, validate(BatchAnalyticsEventsBody), analyticsController.ingestEvents);
analyticsRoutes.post("/internal/jobs/run", internalAccess, validate(TriggerJobBody), analyticsController.runJob);

export { analyticsRoutes };
