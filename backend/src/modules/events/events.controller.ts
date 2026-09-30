import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { EventsService } from "./events.service";

const service = new EventsService();

const requireActor = (req: Request) => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }
  return req.actor;
};

export const eventsController = {
  async listEvents(req: Request, res: Response) {
    const data = await service.listEvents({
      eventType: req.query.eventType as string | undefined,
      query: req.query.query as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20
    });
    res.json(success(data));
  },

  async getEvent(req: Request, res: Response) {
    const data = await service.getEvent(req.params.id);
    res.json(success(data));
  },

  async createEvent(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createEvent(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateEvent(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateEvent(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async deleteEvent(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.deleteEvent(actor, req.params.id);
    res.json(success({ deleted: true }));
  },

  async rsvp(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.rsvp(actor, req.params.id, req.body.status);
    res.json(success(data));
  }
};
