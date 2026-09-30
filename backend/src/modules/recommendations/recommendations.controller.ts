import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { RecommendationsService } from "./recommendations.service";

const service = new RecommendationsService();

const requireActor = (req: Request) => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }
  return req.actor;
};

export const recommendationsController = {
  async getForUser(req: Request, res: Response) {
    const actor = req.actor;
    const isOwner = actor?.userId === req.params.userId;
    const data = await service.getRecommendationsForUser(req.params.userId, isOwner);
    res.json(success(data));
  },

  async getGiven(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.getRecommendationsGiven(actor);
    res.json(success(data));
  },

  async create(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createRecommendation(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateStatus(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateStatus(actor, req.params.id, req.body.status);
    res.json(success(data));
  },

  async delete(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.delete(actor, req.params.id);
    res.json(success({ deleted: true }));
  }
};
