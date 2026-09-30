import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { ArticlesService } from "./articles.service";

const service = new ArticlesService();

const requireActor = (req: Request) => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }
  return req.actor;
};

export const articlesController = {
  async listArticles(req: Request, res: Response) {
    const data = await service.listArticles({
      authorUserId: req.query.authorUserId as string | undefined,
      status: req.query.status as any,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20
    });
    res.json(success(data));
  },

  async getArticle(req: Request, res: Response) {
    const data = await service.getArticle(req.params.idOrSlug);
    res.json(success(data));
  },

  async createArticle(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createArticle(actor, req.body);
    res.status(201).json(success(data));
  },

  async updateArticle(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.updateArticle(actor, req.params.id, req.body);
    res.json(success(data));
  },

  async deleteArticle(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.deleteArticle(actor, req.params.id);
    res.json(success({ deleted: true }));
  },

  async reactToArticle(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.reactToArticle(actor, req.params.id, req.body.reactionType);
    res.json(success(data));
  },

  async removeReaction(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.removeReaction(actor, req.params.id);
    res.json(success({ removed: true }));
  },

  async createComment(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.createComment(actor, req.params.id, req.body.body, req.body.parentCommentId);
    res.status(201).json(success(data));
  },

  async listComments(req: Request, res: Response) {
    const data = await service.listComments(req.params.id);
    res.json(success(data));
  }
};
