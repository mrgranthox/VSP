import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import type { PaginationInput } from "../../lib/pagination";
import { paginated, success } from "../../lib/response";
import { ReviewsService } from "./reviews.service";

class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService = new ReviewsService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  createReview = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.reviewsService.createReview(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getReview = async (req: Request, res: Response): Promise<void> => {
    const result = await this.reviewsService.getReview(req.params.reviewId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getWorkerReviews = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as PaginationInput & { minRating?: number };
    const result = await this.reviewsService.getWorkerReviews(
      req.params.workerId,
      {
        minRating: query.minRating
      },
      query
    );
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  addDimensions = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.reviewsService.addDimensions(req.actor, req.params.reviewId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  createReply = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.reviewsService.createReply(req.actor, req.params.reviewId, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updateReply = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.reviewsService.updateReply(req.actor, req.params.reviewId, req.params.replyId, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deleteReply = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.reviewsService.deleteReply(req.actor, req.params.reviewId, req.params.replyId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  reportReview = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.reviewsService.reportReview(req.actor, req.params.reviewId, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const reviewsController = new ReviewsController();

export { ReviewsController, reviewsController };
