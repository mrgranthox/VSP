import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { socialController } from "./social.controller";
import {
  AddPostMediaBody,
  CommentIdParams,
  CreateCommentBody,
  CreatePostBody,
  GetCommentsQuery,
  GetFeedQuery,
  MediaIdParams,
  PostIdParams,
  ReportCommentBody,
  UpdateCommentBody,
  UpdatePostBody
} from "./social.schemas";

const socialRoutes = Router();

socialRoutes.post("/posts", authenticate, validate(CreatePostBody), socialController.createPost);
socialRoutes.get("/posts", optionalAuthenticate, validate(GetFeedQuery, "query"), socialController.getFeed);
socialRoutes.get("/posts/:postId", optionalAuthenticate, validate(PostIdParams, "params"), socialController.getPost);
socialRoutes.patch("/posts/:postId", authenticate, validate(PostIdParams, "params"), validate(UpdatePostBody), socialController.updatePost);
socialRoutes.delete("/posts/:postId", authenticate, validate(PostIdParams, "params"), socialController.deletePost);
socialRoutes.post(
  "/posts/:postId/media/:mediaId",
  authenticate,
  validate(MediaIdParams, "params"),
  validate(AddPostMediaBody),
  socialController.addPostMedia
);
socialRoutes.delete("/posts/:postId/media/:mediaId", authenticate, validate(MediaIdParams, "params"), socialController.removePostMedia);
socialRoutes.post("/posts/:postId/likes", authenticate, validate(PostIdParams, "params"), socialController.likePost);
socialRoutes.delete("/posts/:postId/likes", authenticate, validate(PostIdParams, "params"), socialController.unlikePost);
socialRoutes.post("/posts/:postId/saves", authenticate, validate(PostIdParams, "params"), socialController.savePost);
socialRoutes.delete("/posts/:postId/saves", authenticate, validate(PostIdParams, "params"), socialController.unsavePost);
socialRoutes.post(
  "/posts/:postId/comments",
  authenticate,
  validate(PostIdParams, "params"),
  validate(CreateCommentBody),
  socialController.createComment
);
socialRoutes.get(
  "/posts/:postId/comments",
  optionalAuthenticate,
  validate(PostIdParams, "params"),
  validate(GetCommentsQuery, "query"),
  socialController.getComments
);
socialRoutes.patch(
  "/comments/:commentId",
  authenticate,
  validate(CommentIdParams, "params"),
  validate(UpdateCommentBody),
  socialController.updateComment
);
socialRoutes.delete("/comments/:commentId", authenticate, validate(CommentIdParams, "params"), socialController.deleteComment);
socialRoutes.post("/comments/:commentId/likes", authenticate, validate(CommentIdParams, "params"), socialController.likeComment);
socialRoutes.delete("/comments/:commentId/likes", authenticate, validate(CommentIdParams, "params"), socialController.unlikeComment);
socialRoutes.post(
  "/comments/:commentId/reports",
  authenticate,
  validate(CommentIdParams, "params"),
  validate(ReportCommentBody),
  socialController.reportComment
);

export { socialRoutes };
