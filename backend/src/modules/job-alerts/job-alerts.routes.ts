import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { jobAlertsController } from "./job-alerts.controller";
import { AlertIdParam, CreateJobAlertBody, UpdateJobAlertBody } from "./job-alerts.schemas";

const jobAlertsRoutes = Router();

jobAlertsRoutes.get("/me/job-alerts", authenticate, jobAlertsController.listUserAlerts);
jobAlertsRoutes.post("/me/job-alerts", authenticate, validate(CreateJobAlertBody), jobAlertsController.create);
jobAlertsRoutes.patch(
  "/me/job-alerts/:id",
  authenticate,
  validate(AlertIdParam, "params"),
  validate(UpdateJobAlertBody),
  jobAlertsController.update
);
jobAlertsRoutes.delete("/me/job-alerts/:id", authenticate, validate(AlertIdParam, "params"), jobAlertsController.delete);

export { jobAlertsRoutes };
