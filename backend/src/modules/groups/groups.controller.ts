import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { GroupsService } from "./groups.service";

const service = new GroupsService();

const requireActor = (req: Request) => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }
  return req.actor;
};

export const groupsController = {
  async listGroups(req: Request, res: Response) {
    const data = await service.listGroups({
      query: req.query.query as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20
    });
    res.json(success(data));
  },

  async getGroup(req: Request, res: Response) {
    const data = await service.getGroup(req.params.id);
    res.json(success(data));
  },

  async createGroup(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createGroup(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateGroup(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateGroup(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async deleteGroup(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.deleteGroup(actor, req.params.id);
    res.json(success({ deleted: true }));
  },

  async joinGroup(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.joinGroup(actor, req.params.id);
    res.json(success(data));
  },

  async leaveGroup(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.leaveGroup(actor, req.params.id);
    res.json(success({ left: true }));
  },

  async getGroupPosts(req: Request, res: Response) {
    const data = await service.getGroupPosts(req.params.id, Number(req.query.page) || 1, Number(req.query.limit) || 20);
    res.json(success(data));
  }
};
