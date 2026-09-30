import type { Request, Response } from "express";

import { Errors } from "../../lib/errors";
import { success } from "../../lib/response";
import { HashtagsService } from "./hashtags.service";

const service = new HashtagsService();

const requireActor = (req: Request) => {
  if (!req.actor) {
    throw Errors.AUTH_SESSION_EXPIRED();
  }
  return req.actor;
};

export const hashtagsController = {
  async getTrending(req: Request, res: Response) {
    const limit = Number(req.query.limit) || 10;
    const data = await service.getTrending(limit);
    res.json(success(data));
  },

  async getHashtagFeed(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await service.getHashtagFeed(req.params.tag, page, limit);
    res.json(success(data));
  },

  async followHashtag(req: Request, res: Response) {
    const actor = requireActor(req);
    const data = await service.followHashtag(actor, req.params.tag);
    res.json(success(data));
  },

  async unfollowHashtag(req: Request, res: Response) {
    const actor = requireActor(req);
    await service.unfollowHashtag(actor, req.params.tag);
    res.json(success({ unfollowed: true }));
  }
};
