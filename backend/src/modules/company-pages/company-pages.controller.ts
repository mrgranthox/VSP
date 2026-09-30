import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { CompanyPagesService } from "./company-pages.service";

const service = new CompanyPagesService();

const requireActor = (req: Request) => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }
  return req.actor;
};

export const companyPagesController = {
  async listCompanies(req: Request, res: Response) {
    const data = await service.listCompanies({
      industry: req.query.industry as string | undefined,
      query: req.query.query as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20
    });
    res.json(success(data));
  },

  async getCompany(req: Request, res: Response) {
    const data = await service.getCompany(req.params.idOrSlug);
    res.json(success(data));
  },

  async createCompany(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createCompany(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateCompany(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateCompany(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async deleteCompany(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.deleteCompany(actor, req.params.id);
    res.json(success({ deleted: true }));
  },

  async followCompany(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.followCompany(actor, req.params.id);
    res.json(success(data));
  },

  async unfollowCompany(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.unfollowCompany(actor, req.params.id);
    res.json(success({ unfollowed: true }));
  }
};
