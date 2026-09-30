import { Router } from "express";

import { authenticate, optionalAuthenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { companyPagesController } from "./company-pages.controller";
import {
  CompanyIdParam,
  CompanyUuidParam,
  CreateCompanyBody,
  GetCompaniesQuery,
  UpdateCompanyBody
} from "./company-pages.schemas";

const companyPagesRoutes = Router();

companyPagesRoutes.get("/companies", optionalAuthenticate, validate(GetCompaniesQuery, "query"), companyPagesController.listCompanies);
companyPagesRoutes.get("/companies/:idOrSlug", optionalAuthenticate, validate(CompanyIdParam, "params"), companyPagesController.getCompany);
companyPagesRoutes.post("/companies", authenticate, validate(CreateCompanyBody), companyPagesController.createCompany);
companyPagesRoutes.patch(
  "/companies/:id",
  authenticate,
  validate(CompanyUuidParam, "params"),
  validate(UpdateCompanyBody),
  companyPagesController.updateCompany
);
companyPagesRoutes.delete("/companies/:id", authenticate, validate(CompanyUuidParam, "params"), companyPagesController.deleteCompany);
companyPagesRoutes.post("/companies/:id/follow", authenticate, validate(CompanyUuidParam, "params"), companyPagesController.followCompany);
companyPagesRoutes.delete("/companies/:id/follow", authenticate, validate(CompanyUuidParam, "params"), companyPagesController.unfollowCompany);

export { companyPagesRoutes };
