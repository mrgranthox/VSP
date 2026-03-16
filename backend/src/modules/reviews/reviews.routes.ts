import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { reviewsController } from "./reviews.controller";
import {
  AddDimensionsBody,
  CreateReviewBody,
  CreateReviewReplyBody,
  GetWorkerReviewsParams,
  GetWorkerReviewsQuery,
  ReplyIdParams,
  ReportReviewBody,
  ReviewIdParams,
  UpdateReviewReplyBody
} from "./reviews.schemas";

const reviewsRoutes = Router();

reviewsRoutes.post("/reviews", authenticate, validate(CreateReviewBody), reviewsController.createReview);
reviewsRoutes.get("/reviews/:reviewId", validate(ReviewIdParams, "params"), reviewsController.getReview);
reviewsRoutes.get(
  "/workers/:workerId/reviews",
  validate(GetWorkerReviewsParams, "params"),
  validate(GetWorkerReviewsQuery, "query"),
  reviewsController.getWorkerReviews
);
reviewsRoutes.post(
  "/reviews/:reviewId/dimensions",
  authenticate,
  validate(ReviewIdParams, "params"),
  validate(AddDimensionsBody),
  reviewsController.addDimensions
);
reviewsRoutes.post(
  "/reviews/:reviewId/replies",
  authenticate,
  validate(ReviewIdParams, "params"),
  validate(CreateReviewReplyBody),
  reviewsController.createReply
);
reviewsRoutes.patch(
  "/reviews/:reviewId/replies/:replyId",
  authenticate,
  validate(ReplyIdParams, "params"),
  validate(UpdateReviewReplyBody),
  reviewsController.updateReply
);
reviewsRoutes.delete(
  "/reviews/:reviewId/replies/:replyId",
  authenticate,
  validate(ReplyIdParams, "params"),
  reviewsController.deleteReply
);
reviewsRoutes.post(
  "/reviews/:reviewId/report",
  authenticate,
  validate(ReviewIdParams, "params"),
  validate(ReportReviewBody),
  reviewsController.reportReview
);

export { reviewsRoutes };
