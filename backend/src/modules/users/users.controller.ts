import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import type { PaginationInput } from "../../lib/pagination";
import { paginated, success } from "../../lib/response";
import { UsersService } from "./users.service";

class UsersController {
  constructor(private readonly usersService: UsersService = new UsersService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.usersService.getMe(req.actor);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.usersService.updateMe(req.actor, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getPreferences = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.usersService.getNotificationPreferences(req.actor);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updatePreferences = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.usersService.updateNotificationPreferences(req.actor, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getSavedWorkers = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.usersService.getSavedWorkers(req.actor, req.query as unknown as PaginationInput);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  saveWorker = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.usersService.saveWorker(req.actor, req.params.workerId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  unsaveWorker = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.usersService.unsaveWorker(req.actor, req.params.workerId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  getFollows = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.usersService.getFollows(req.actor, req.query as unknown as PaginationInput);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  followTarget = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.usersService.followTarget(req.actor, req.body.targetType, req.body.targetId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  unfollowTarget = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.usersService.unfollowTarget(req.actor, req.params.targetType as "USER" | "WORKER", req.params.targetId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  publicProfile = async (req: Request, res: Response): Promise<void> => {
    const result = await this.usersService.getPublicProfile(req.params.userId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deleteMe = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.usersService.deleteMe(req.actor);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };
}

const usersController = new UsersController();

export { usersController, UsersController };
