import { z } from "zod";

export const CreateExperienceBody = z.object({
  title: z.string().min(2).max(120),
  company: z.string().min(2).max(120),
  location: z.string().max(120).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  isCurrent: z.boolean().default(false),
  description: z.string().max(2000).optional().nullable(),
  skills: z.array(z.string()).default([])
});

export const UpdateExperienceBody = CreateExperienceBody.partial();

export const CreateEducationBody = z.object({
  school: z.string().min(2).max(160),
  degree: z.string().max(120).optional().nullable(),
  fieldOfStudy: z.string().max(120).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  grade: z.string().max(40).optional().nullable(),
  activities: z.string().max(500).optional().nullable(),
  description: z.string().max(1000).optional().nullable()
});

export const UpdateEducationBody = CreateEducationBody.partial();

export const CreateAccomplishmentBody = z.object({
  type: z.enum(["CERTIFICATE", "LICENSE", "PROJECT", "AWARD"]),
  title: z.string().min(2).max(160),
  issuer: z.string().max(160).optional().nullable(),
  issueDate: z.string().datetime().optional().nullable(),
  expirationDate: z.string().datetime().optional().nullable(),
  credentialId: z.string().max(120).optional().nullable(),
  credentialUrl: z.string().url().optional().nullable(),
  description: z.string().max(1000).optional().nullable()
});

export const UpdateAccomplishmentBody = CreateAccomplishmentBody.partial();

export const CreateVolunteerBody = z.object({
  organization: z.string().min(2).max(160),
  role: z.string().min(2).max(120),
  cause: z.string().max(120).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  description: z.string().max(1000).optional().nullable()
});

export const UpdateVolunteerBody = CreateVolunteerBody.partial();

export const CreateFeaturedItemBody = z.object({
  itemType: z.enum(["POST", "LINK", "MEDIA", "ARTICLE"]),
  title: z.string().min(2).max(160),
  description: z.string().max(500).optional().nullable(),
  url: z.string().url().optional().nullable(),
  mediaUrl: z.string().url().optional().nullable(),
  postId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().default(0)
});

export const UpdateFeaturedItemBody = CreateFeaturedItemBody.partial();

export const UpdateOpenToWorkBody = z.object({
  openToWork: z.boolean(),
  openToWorkTitle: z.string().max(120).optional().nullable(),
  openToHire: z.boolean().optional()
});

export const SectionIdParam = z.object({
  id: z.string().uuid()
});

export const UserIdParam = z.object({
  userId: z.string().uuid()
});
