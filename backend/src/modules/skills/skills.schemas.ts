import { z } from "zod";

export const CreateSkillBody = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(100),
  isVerified: z.boolean().default(false)
});

export const UpdateSkillBody = CreateSkillBody.partial();

export const GetSkillsQuery = z.object({
  category: z.string().optional(),
  query: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1)
});

export const AddUserSkillBody = z.object({
  skillId: z.string().uuid()
});

export const SkillIdParam = z.object({
  skillId: z.string().uuid()
});

export const UserSkillParam = z.object({
  userId: z.string().uuid(),
  skillId: z.string().uuid()
});

export const UserIdParam = z.object({
  userId: z.string().uuid()
});
