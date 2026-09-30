import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { recommendationsController } from "./recommendations.controller";
import {
  CreateRecommendationBody,
  RecommendationIdParam,
  UpdateRecommendationStatusBody,
  UserIdParam
} from "./recommendations.schemas";

const recommendationsRoutes = Router();

// Public user recommendations list
recommendationsRoutes.get("/users/:userId/recommendations", optionalAuthenticate, validate(UserIdParam, "params"), recommendationsController.getForUser);

// Recommendations given by current user
recommendationsRoutes.get("/me/recommendations/given", authenticate, recommendationsController.getGiven);

// Create recommendation for another user
recommendationsRoutes.post("/recommendations", authenticate, validate(CreateRecommendationBody), recommendationsController.create);

// Update status (ACCEPT, DECLINE, HIDE)
recommendationsRoutes.patch(
  "/recommendations/:id/status",
  authenticate,
  validate(RecommendationIdParam, "params"),
  validate(UpdateRecommendationStatusBody),
  recommendationsController.updateStatus
);

// Delete recommendation
recommendationsRoutes.delete(
  "/recommendations/:id",
  authenticate,
  validate(RecommendationIdParam, "params"),
  recommendationsController.delete
);

export { recommendationsRoutes };
