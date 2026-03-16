import { type Request, type Response } from "express";
import { type RequestStatus } from "@prisma/client";

import { Errors } from "../../lib/errors";
import type { PaginationInput } from "../../lib/pagination";
import { paginated, success } from "../../lib/response";
import { RequestsService } from "./requests.service";

class RequestsController {
  constructor(private readonly requestsService: RequestsService = new RequestsService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  createRequest = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const idempotencyKey = req.header("x-idempotency-key") ?? undefined;
    const result = await this.requestsService.createRequest(req.actor, req.body, idempotencyKey);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getRequests = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const query = req.query as unknown as PaginationInput & { status?: RequestStatus };
    const result = await this.requestsService.getRequests(req.actor, { status: query.status }, query);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  getRequest = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.getRequest(req.actor, req.params.requestId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateRequest = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.updateRequest(req.actor, req.params.requestId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  addItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.addItem(req.actor, req.params.requestId, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.updateItem(req.actor, req.params.requestId, req.params.itemId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  removeItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.requestsService.removeItem(req.actor, req.params.requestId, req.params.itemId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  createAssignment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.createAssignment(req.actor, req.params.requestId, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  acceptAssignment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.acceptAssignment(req.actor, req.params.requestId, req.params.assignmentId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  declineAssignment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.declineAssignment(req.actor, req.params.requestId, req.params.assignmentId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  cancelRequest = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.cancelRequest(req.actor, req.params.requestId, req.body.reason);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  expireRequest = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.expireRequest(req.actor, req.params.requestId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getStatusHistory = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.requestsService.getStatusHistory(req.actor, req.params.requestId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const requestsController = new RequestsController();

export { RequestsController, requestsController };
