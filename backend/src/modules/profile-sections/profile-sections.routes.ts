import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { profileSectionsController } from "./profile-sections.controller";
import {
  CreateAccomplishmentBody,
  CreateEducationBody,
  CreateExperienceBody,
  CreateFeaturedItemBody,
  CreateVolunteerBody,
  SectionIdParam,
  UpdateAccomplishmentBody,
  UpdateEducationBody,
  UpdateExperienceBody,
  UpdateFeaturedItemBody,
  UpdateOpenToWorkBody,
  UpdateVolunteerBody,
  UserIdParam
} from "./profile-sections.schemas";

const profileSectionsRoutes = Router();

// Public user sections view & view tracking
profileSectionsRoutes.get("/users/:userId/sections", validate(UserIdParam, "params"), profileSectionsController.getUserSections);
profileSectionsRoutes.post("/users/:userId/views", optionalAuthenticate, validate(UserIdParam, "params"), profileSectionsController.recordProfileView);

// Authenticated current-user profile sections management
profileSectionsRoutes.get("/me/profile-views", authenticate, profileSectionsController.getProfileViews);
profileSectionsRoutes.patch("/me/open-to-work", authenticate, validate(UpdateOpenToWorkBody), profileSectionsController.updateOpenToWork);

// Experiences
profileSectionsRoutes.post("/me/experiences", authenticate, validate(CreateExperienceBody), profileSectionsController.createExperience);
profileSectionsRoutes.patch(
  "/me/experiences/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  validate(UpdateExperienceBody),
  profileSectionsController.updateExperience
);
profileSectionsRoutes.delete(
  "/me/experiences/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  profileSectionsController.deleteExperience
);

// Educations
profileSectionsRoutes.post("/me/educations", authenticate, validate(CreateEducationBody), profileSectionsController.createEducation);
profileSectionsRoutes.patch(
  "/me/educations/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  validate(UpdateEducationBody),
  profileSectionsController.updateEducation
);
profileSectionsRoutes.delete(
  "/me/educations/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  profileSectionsController.deleteEducation
);

// Accomplishments (Licenses, Certifications, Awards, Projects)
profileSectionsRoutes.post(
  "/me/accomplishments",
  authenticate,
  validate(CreateAccomplishmentBody),
  profileSectionsController.createAccomplishment
);
profileSectionsRoutes.patch(
  "/me/accomplishments/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  validate(UpdateAccomplishmentBody),
  profileSectionsController.updateAccomplishment
);
profileSectionsRoutes.delete(
  "/me/accomplishments/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  profileSectionsController.deleteAccomplishment
);

// Volunteers
profileSectionsRoutes.post("/me/volunteers", authenticate, validate(CreateVolunteerBody), profileSectionsController.createVolunteer);
profileSectionsRoutes.patch(
  "/me/volunteers/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  validate(UpdateVolunteerBody),
  profileSectionsController.updateVolunteer
);
profileSectionsRoutes.delete(
  "/me/volunteers/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  profileSectionsController.deleteVolunteer
);

// Featured items
profileSectionsRoutes.post("/me/featured", authenticate, validate(CreateFeaturedItemBody), profileSectionsController.createFeaturedItem);
profileSectionsRoutes.patch(
  "/me/featured/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  validate(UpdateFeaturedItemBody),
  profileSectionsController.updateFeaturedItem
);
profileSectionsRoutes.delete(
  "/me/featured/:id",
  authenticate,
  validate(SectionIdParam, "params"),
  profileSectionsController.deleteFeaturedItem
);

export { profileSectionsRoutes };
