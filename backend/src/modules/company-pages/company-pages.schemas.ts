import { z } from "zod";

export const CreateCompanyBody = z.object({
  name: z.string().min(2).max(120),
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().min(10).max(3000),
  website: z.string().url().optional().nullable(),
  industry: z.string().min(2).max(100),
  companySize: z.string().max(40).optional().nullable(),
  headquarters: z.string().max(160).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable()
});

export const UpdateCompanyBody = CreateCompanyBody.partial();

export const GetCompaniesQuery = z.object({
  industry: z.string().optional(),
  query: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const CompanyIdParam = z.object({
  idOrSlug: z.string().min(1)
});

export const CompanyUuidParam = z.object({
  id: z.string().uuid()
});
