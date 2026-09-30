import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { JobAlertsService } from "./job-alerts.service";

const service = new JobAlertsService();

const requireActor = (req: Request) => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }
  return req.actor;
};

export const jobAlertsController = {
  async listUserAlerts(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.listUserAlerts(actor);
    res.json(success(data));
  },

  async create(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.create(actor, req.body);
    res.status(201).json(success(data));
  },

  async update(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.update(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async delete(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.delete(actor, req.params.id);
    res.json(success({ deleted: true }));
  }
};
