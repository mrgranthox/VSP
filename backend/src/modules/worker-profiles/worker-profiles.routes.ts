import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { workerProfilesController } from "./worker-profiles.controller";
import {
  AreaIdParam,
  CertificationIdParam,
  CreateAvailabilityExceptionBody,
  CreateAvailabilityRuleBody,
  CreateCertificationBody,
  CreatePortfolioItemBody,
  CreateServiceAreaBody,
  CreateWorkerProfileBody,
  CreateWorkerServiceBody,
  ExceptionIdParam,
  PortfolioItemIdParam,
  RuleIdParam,
  ServiceIdParam,
  SubmitVerificationBody,
  TradeIdParam,
  UpdateAvailabilityExceptionBody,
  UpdateAvailabilityRuleBody,
  UpdateCertificationBody,
  UpdatePortfolioItemBody,
  UpdateServiceAreaBody,
  UpdateWorkerProfileBody,
  UpdateWorkerServiceBody,
  WorkerIdParam
} from "./worker-profiles.schemas";

const workerProfilesRoutes = Router();

workerProfilesRoutes.post("/", authenticate, validate(CreateWorkerProfileBody), workerProfilesController.create);
workerProfilesRoutes.get("/me", authenticate, workerProfilesController.me);
workerProfilesRoutes.patch("/me", authenticate, validate(UpdateWorkerProfileBody), workerProfilesController.updateMe);

workerProfilesRoutes.post("/me/trades/:tradeId", authenticate, validate(TradeIdParam, "params"), workerProfilesController.addTrade);
workerProfilesRoutes.delete(
  "/me/trades/:tradeId",
  authenticate,
  validate(TradeIdParam, "params"),
  workerProfilesController.removeTrade
);

workerProfilesRoutes.post("/me/services", authenticate, validate(CreateWorkerServiceBody), workerProfilesController.createService);
workerProfilesRoutes.patch(
  "/me/services/:serviceId",
  authenticate,
  validate(ServiceIdParam, "params"),
  validate(UpdateWorkerServiceBody),
  workerProfilesController.updateService
);
workerProfilesRoutes.delete(
  "/me/services/:serviceId",
  authenticate,
  validate(ServiceIdParam, "params"),
  workerProfilesController.deleteService
);

workerProfilesRoutes.post("/me/service-areas", authenticate, validate(CreateServiceAreaBody), workerProfilesController.createServiceArea);
workerProfilesRoutes.patch(
  "/me/service-areas/:areaId",
  authenticate,
  validate(AreaIdParam, "params"),
  validate(UpdateServiceAreaBody),
  workerProfilesController.updateServiceArea
);
workerProfilesRoutes.delete(
  "/me/service-areas/:areaId",
  authenticate,
  validate(AreaIdParam, "params"),
  workerProfilesController.deleteServiceArea
);

workerProfilesRoutes.post(
  "/me/availability/rules",
  authenticate,
  validate(CreateAvailabilityRuleBody),
  workerProfilesController.createAvailabilityRule
);
workerProfilesRoutes.patch(
  "/me/availability/rules/:ruleId",
  authenticate,
  validate(RuleIdParam, "params"),
  validate(UpdateAvailabilityRuleBody),
  workerProfilesController.updateAvailabilityRule
);
workerProfilesRoutes.delete(
  "/me/availability/rules/:ruleId",
  authenticate,
  validate(RuleIdParam, "params"),
  workerProfilesController.deleteAvailabilityRule
);

workerProfilesRoutes.post(
  "/me/availability/exceptions",
  authenticate,
  validate(CreateAvailabilityExceptionBody),
  workerProfilesController.createAvailabilityException
);
workerProfilesRoutes.patch(
  "/me/availability/exceptions/:exceptionId",
  authenticate,
  validate(ExceptionIdParam, "params"),
  validate(UpdateAvailabilityExceptionBody),
  workerProfilesController.updateAvailabilityException
);
workerProfilesRoutes.delete(
  "/me/availability/exceptions/:exceptionId",
  authenticate,
  validate(ExceptionIdParam, "params"),
  workerProfilesController.deleteAvailabilityException
);

workerProfilesRoutes.post("/me/portfolio", authenticate, validate(CreatePortfolioItemBody), workerProfilesController.createPortfolioItem);
workerProfilesRoutes.patch(
  "/me/portfolio/:itemId",
  authenticate,
  validate(PortfolioItemIdParam, "params"),
  validate(UpdatePortfolioItemBody),
  workerProfilesController.updatePortfolioItem
);
workerProfilesRoutes.delete(
  "/me/portfolio/:itemId",
  authenticate,
  validate(PortfolioItemIdParam, "params"),
  workerProfilesController.deletePortfolioItem
);

workerProfilesRoutes.post(
  "/me/certifications",
  authenticate,
  validate(CreateCertificationBody),
  workerProfilesController.createCertification
);
workerProfilesRoutes.patch(
  "/me/certifications/:certId",
  authenticate,
  validate(CertificationIdParam, "params"),
  validate(UpdateCertificationBody),
  workerProfilesController.updateCertification
);
workerProfilesRoutes.delete(
  "/me/certifications/:certId",
  authenticate,
  validate(CertificationIdParam, "params"),
  workerProfilesController.deleteCertification
);

workerProfilesRoutes.post(
  "/me/verification-requests",
  authenticate,
  validate(SubmitVerificationBody),
  workerProfilesController.submitVerificationRequest
);

workerProfilesRoutes.get("/:workerId", validate(WorkerIdParam, "params"), workerProfilesController.getById);

export { workerProfilesRoutes };
