import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { articlesController } from "./articles.controller";
import {
  ArticleIdParam,
  ArticleReactionBody,
  ArticleUuidParam,
  CreateArticleBody,
  CreateArticleCommentBody,
  GetArticlesQuery,
  UpdateArticleBody
} from "./articles.schemas";

const articlesRoutes = Router();

articlesRoutes.get("/articles", optionalAuthenticate, validate(GetArticlesQuery, "query"), articlesController.listArticles);
articlesRoutes.get("/articles/:idOrSlug", optionalAuthenticate, validate(ArticleIdParam, "params"), articlesController.getArticle);
articlesRoutes.post("/articles", authenticate, validate(CreateArticleBody), articlesController.createArticle);
articlesRoutes.patch(
  "/articles/:id",
  authenticate,
  validate(ArticleUuidParam, "params"),
  validate(UpdateArticleBody),
  articlesController.updateArticle
);
articlesRoutes.delete("/articles/:id", authenticate, validate(ArticleUuidParam, "params"), articlesController.deleteArticle);

// Reactions & Comments
articlesRoutes.post(
  "/articles/:id/reactions",
  authenticate,
  validate(ArticleUuidParam, "params"),
  validate(ArticleReactionBody),
  articlesController.reactToArticle
);
articlesRoutes.delete("/articles/:id/reactions", authenticate, validate(ArticleUuidParam, "params"), articlesController.removeReaction);
articlesRoutes.post(
  "/articles/:id/comments",
  authenticate,
  validate(ArticleUuidParam, "params"),
  validate(CreateArticleCommentBody),
  articlesController.createComment
);
articlesRoutes.get("/articles/:id/comments", optionalAuthenticate, validate(ArticleUuidParam, "params"), articlesController.listComments);

export { articlesRoutes };
