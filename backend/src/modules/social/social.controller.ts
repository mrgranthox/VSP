import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import type { PaginationInput } from "../../lib/pagination";
import { paginated, success } from "../../lib/response";
import { SocialService } from "./social.service";

class SocialController {
  constructor(private readonly socialService: SocialService = new SocialService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  getFeed = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as { since?: string } & PaginationInput;
    const result = await this.socialService.getFeed(req.actor, { since: query.since }, query);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  createPost = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.socialService.createPost(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getPost = async (req: Request, res: Response): Promise<void> => {
    const result = await this.socialService.getPost(req.params.postId, req.actor);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updatePost = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.socialService.updatePost(req.actor, req.params.postId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deletePost = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.deletePost(req.actor, req.params.postId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  addPostMedia = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.addPostMedia(req.actor, req.params.postId, req.params.mediaId, req.body);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  removePostMedia = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.removePostMedia(req.actor, req.params.postId, req.params.mediaId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  likePost = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.likePost(req.actor, req.params.postId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  unlikePost = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.unlikePost(req.actor, req.params.postId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  savePost = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.savePost(req.actor, req.params.postId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  unsavePost = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.unsavePost(req.actor, req.params.postId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  createComment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.socialService.createComment(req.actor, req.params.postId, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getComments = async (req: Request, res: Response): Promise<void> => {
    const result = await this.socialService.getComments(req.params.postId, req.query as unknown as PaginationInput, req.actor);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  updateComment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.socialService.updateComment(req.actor, req.params.commentId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deleteComment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.deleteComment(req.actor, req.params.commentId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  likeComment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.likeComment(req.actor, req.params.commentId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  unlikeComment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.unlikeComment(req.actor, req.params.commentId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  reportComment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.socialService.reportComment(req.actor, req.params.commentId, req.body);
    res.status(201).json(success({}, { requestId: this.getRequestId(req) }));
  };
}

const socialController = new SocialController();

export { SocialController, socialController };
