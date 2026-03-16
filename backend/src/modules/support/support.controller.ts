import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import { paginated, success } from "../../lib/response";
import { SupportService } from "./support.service";

class SupportController {
  constructor(private readonly supportService: SupportService = new SupportService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  createTicket = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.supportService.createTicket(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getTickets = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const query = req.query as unknown as { page: number; limit: number };
    const result = await this.supportService.getTickets(req.actor, query);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  getTicket = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.supportService.getTicket(req.actor, req.params.ticketId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  addMessage = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.supportService.addMessage(req.actor, req.params.ticketId, req.body);
    res.status(201).json(success({}, { requestId: this.getRequestId(req) }));
  };

  updateTicket = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.supportService.updateTicket(req.actor, req.params.ticketId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const supportController = new SupportController();

export { SupportController, supportController };
