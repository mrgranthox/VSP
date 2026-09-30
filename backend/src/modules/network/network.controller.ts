import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { NetworkService } from "./network.service";

class NetworkController {
  constructor(private readonly networkService: NetworkService = new NetworkService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  getConnectionDegree = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
    const result = await this.networkService.getConnectionDegree(req.actor, req.params.userId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getPeopleYouMayKnow = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
    const limit = Number(req.query.limit) || 10;
    const result = await this.networkService.getPeopleYouMayKnow(req.actor, limit);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  connect = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
    const result = await this.networkService.connect(req.actor, req.params.userId, req.body?.note);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  acceptInvitation = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
    const result = await this.networkService.acceptInvitation(req.actor, req.params.invitationId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  ignoreInvitation = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
    const result = await this.networkService.ignoreInvitation(req.actor, req.params.invitationId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getNetworkStats = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
    const result = await this.networkService.getNetworkStats(req.actor);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const networkController = new NetworkController();

export { NetworkController, networkController };
