import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { WorkerProfilesService } from "./worker-profiles.service";

class WorkerProfilesController {
  constructor(private readonly workerProfilesService: WorkerProfilesService = new WorkerProfilesService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.createWorkerProfile(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.getMyWorkerProfile(req.actor);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.updateMyWorkerProfile(req.actor, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const result = await this.workerProfilesService.getPublicWorkerProfile(req.params.workerId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  addTrade = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.addTradeCategory(req.actor, req.params.tradeId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  removeTrade = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.workerProfilesService.removeTradeCategory(req.actor, req.params.tradeId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  createService = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.createService(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateService = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.updateService(req.actor, req.params.serviceId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deleteService = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.workerProfilesService.deleteService(req.actor, req.params.serviceId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  createServiceArea = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.createServiceArea(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateServiceArea = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.updateServiceArea(req.actor, req.params.areaId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deleteServiceArea = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.workerProfilesService.deleteServiceArea(req.actor, req.params.areaId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  createAvailabilityRule = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.createAvailabilityRule(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateAvailabilityRule = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.updateAvailabilityRule(req.actor, req.params.ruleId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deleteAvailabilityRule = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.workerProfilesService.deleteAvailabilityRule(req.actor, req.params.ruleId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  createAvailabilityException = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.createAvailabilityException(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateAvailabilityException = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.updateAvailabilityException(req.actor, req.params.exceptionId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deleteAvailabilityException = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.workerProfilesService.deleteAvailabilityException(req.actor, req.params.exceptionId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  createPortfolioItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.createPortfolioItem(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updatePortfolioItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.updatePortfolioItem(req.actor, req.params.itemId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deletePortfolioItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.workerProfilesService.deletePortfolioItem(req.actor, req.params.itemId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  createCertification = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.createCertification(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateCertification = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.updateCertification(req.actor, req.params.certId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deleteCertification = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.workerProfilesService.deleteCertification(req.actor, req.params.certId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  submitVerificationRequest = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.workerProfilesService.submitVerificationRequest(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const workerProfilesController = new WorkerProfilesController();

export { workerProfilesController, WorkerProfilesController };
