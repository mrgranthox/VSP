import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { SkillsService } from "./skills.service";

const service = new SkillsService();

const requireActor = (req: Request) => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }
  return req.actor;
};

export const skillsController = {
  async listSkills(req: Request, res: Response) {
    const data = await service.listSkills({
      category: req.query.category as string | undefined,
      query: req.query.query as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50
    });
    res.json(success(data));
  },

  async createSkill(req: Request, res: Response) {
    const data = await service.createSkill(req.body);
    res.status(201).json(success(data));
  },

  async updateSkill(req: Request, res: Response) {
    const data = await service.updateSkill(req.params.skillId, req.body);
    res.json(success(data));
  },

  async deleteSkill(req: Request, res: Response) {
    await service.deleteSkill(req.params.skillId);
    res.json(success({ deleted: true }));
  },

  async getUserSkills(req: Request, res: Response) {
    const data = await service.getUserSkills(req.params.userId);
    res.json(success(data));
  },

  async addUserSkill(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.addUserSkill(actor, req.body.skillId);
    res.status(201).json(success(data));
  },

  async removeUserSkill(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.removeUserSkill(actor, req.params.skillId);
    res.json(success({ removed: true }));
  },

  async endorseSkill(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.endorseSkill(actor, req.params.userId, req.params.skillId);
    res.json(success(data));
  },

  async removeEndorsement(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.removeEndorsement(actor, req.params.userId, req.params.skillId);
    res.json(success({ removed: true }));
  }
};
