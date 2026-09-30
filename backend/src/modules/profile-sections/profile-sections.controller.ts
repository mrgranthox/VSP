import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { ProfileSectionsService } from "./profile-sections.service";

const service = new ProfileSectionsService();

const requireActor = (req: Request) => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }
  return req.actor;
};

export const profileSectionsController = {
  async getUserSections(req: Request, res: Response) {
    const data = await service.getUserSections(req.params.userId);
    res.json(success(data));
  },

  async createExperience(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createExperience(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateExperience(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateExperience(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async deleteExperience(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.deleteExperience(actor, req.params.id);
    res.json(success({ deleted: true }));
  },

  async createEducation(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createEducation(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateEducation(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateEducation(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async deleteEducation(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.deleteEducation(actor, req.params.id);
    res.json(success({ deleted: true }));
  },

  async createAccomplishment(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createAccomplishment(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateAccomplishment(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateAccomplishment(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async deleteAccomplishment(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.deleteAccomplishment(actor, req.params.id);
    res.json(success({ deleted: true }));
  },

  async createVolunteer(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createVolunteer(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateVolunteer(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateVolunteer(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async deleteVolunteer(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.deleteVolunteer(actor, req.params.id);
    res.json(success({ deleted: true }));
  },

  async createFeaturedItem(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createFeaturedItem(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateFeaturedItem(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateFeaturedItem(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async deleteFeaturedItem(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.deleteFeaturedItem(actor, req.params.id);
    res.json(success({ deleted: true }));
  },

  async updateOpenToWork(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateOpenToWork(actor, req.body);
    res.json(success(data));
  },

  async recordProfileView(req: Request, res: Response) {
    const actor = req.actor;
    await service.recordProfileView(req.params.userId, actor?.userId);
    res.json(success({ recorded: true }));
  },

  async getProfileViews(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.getProfileViews(actor);
    res.json(success(data));
  }
};
