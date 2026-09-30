import { z } from "zod";

export const CreateGroupBody = z.object({
  name: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  coverImageUrl: z.string().url().optional().nullable(),
  privacy: z.enum(["OPEN", "PRIVATE"]).default("OPEN")
});

export const UpdateGroupBody = CreateGroupBody.partial();

export const GetGroupsQuery = z.object({
  query: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const GroupIdParam = z.object({
  id: z.string().uuid()
});
