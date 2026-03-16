import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { usersController } from "./users.controller";
import "./users.events";
import {
  AddFollowBody,
  FollowParams,
  PaginationQuery,
  UpdateNotificationPreferencesBody,
  UpdateUserMeBody,
  UserIdPathParam,
  WorkerIdPathParam
} from "./users.schemas";

const usersRoutes = Router();

usersRoutes.get("/me", authenticate, usersController.me);
usersRoutes.patch("/me", authenticate, validate(UpdateUserMeBody), usersController.updateMe);
usersRoutes.get("/me/preferences", authenticate, usersController.getPreferences);
usersRoutes.patch(
  "/me/preferences",
  authenticate,
  validate(UpdateNotificationPreferencesBody),
  usersController.updatePreferences
);
usersRoutes.get("/me/saved-workers", authenticate, validate(PaginationQuery, "query"), usersController.getSavedWorkers);
usersRoutes.post("/me/saved-workers/:workerId", authenticate, validate(WorkerIdPathParam, "params"), usersController.saveWorker);
usersRoutes.delete("/me/saved-workers/:workerId", authenticate, validate(WorkerIdPathParam, "params"), usersController.unsaveWorker);
usersRoutes.get("/me/follows", authenticate, validate(PaginationQuery, "query"), usersController.getFollows);
usersRoutes.post("/me/follows", authenticate, validate(AddFollowBody), usersController.followTarget);
usersRoutes.delete("/me/follows/:targetType/:targetId", authenticate, validate(FollowParams, "params"), usersController.unfollowTarget);
usersRoutes.delete("/me", authenticate, usersController.deleteMe);
usersRoutes.get("/:userId/profile", validate(UserIdPathParam, "params"), usersController.publicProfile);

export { usersRoutes };
