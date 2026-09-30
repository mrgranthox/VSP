import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { groupsController } from "./groups.controller";
import { CreateGroupBody, GetGroupsQuery, GroupIdParam, UpdateGroupBody } from "./groups.schemas";

const groupsRoutes = Router();

groupsRoutes.get("/groups", optionalAuthenticate, validate(GetGroupsQuery, "query"), groupsController.listGroups);
groupsRoutes.get("/groups/:id", optionalAuthenticate, validate(GroupIdParam, "params"), groupsController.getGroup);
groupsRoutes.post("/groups", authenticate, validate(CreateGroupBody), groupsController.createGroup);
groupsRoutes.patch(
  "/groups/:id",
  authenticate,
  validate(GroupIdParam, "params"),
  validate(UpdateGroupBody),
  groupsController.updateGroup
);
groupsRoutes.delete("/groups/:id", authenticate, validate(GroupIdParam, "params"), groupsController.deleteGroup);
groupsRoutes.post("/groups/:id/join", authenticate, validate(GroupIdParam, "params"), groupsController.joinGroup);
groupsRoutes.post("/groups/:id/leave", authenticate, validate(GroupIdParam, "params"), groupsController.leaveGroup);
groupsRoutes.get("/groups/:id/posts", optionalAuthenticate, validate(GroupIdParam, "params"), groupsController.getGroupPosts);

export { groupsRoutes };
