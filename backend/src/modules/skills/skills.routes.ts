import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { skillsController } from "./skills.controller";
import {
  AddUserSkillBody,
  CreateSkillBody,
  GetSkillsQuery,
  SkillIdParam,
  UpdateSkillBody,
  UserIdParam,
  UserSkillParam
} from "./skills.schemas";

const skillsRoutes = Router();

// Public / taxonomy skills listing
skillsRoutes.get("/skills", validate(GetSkillsQuery, "query"), skillsController.listSkills);
skillsRoutes.post("/skills", authenticate, validate(CreateSkillBody), skillsController.createSkill);
skillsRoutes.patch("/skills/:skillId", authenticate, validate(SkillIdParam, "params"), validate(UpdateSkillBody), skillsController.updateSkill);
skillsRoutes.delete("/skills/:skillId", authenticate, validate(SkillIdParam, "params"), skillsController.deleteSkill);

// User skills
skillsRoutes.get("/users/:userId/skills", validate(UserIdParam, "params"), skillsController.getUserSkills);
skillsRoutes.post("/me/skills", authenticate, validate(AddUserSkillBody), skillsController.addUserSkill);
skillsRoutes.delete("/me/skills/:skillId", authenticate, validate(SkillIdParam, "params"), skillsController.removeUserSkill);

// Endorsements
skillsRoutes.post("/users/:userId/skills/:skillId/endorse", authenticate, validate(UserSkillParam, "params"), skillsController.endorseSkill);
skillsRoutes.delete("/users/:userId/skills/:skillId/endorse", authenticate, validate(UserSkillParam, "params"), skillsController.removeEndorsement);

export { skillsRoutes };
