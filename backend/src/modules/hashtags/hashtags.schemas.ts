import { z } from "zod";

export const TagParam = z.object({
  tag: z.string().min(1).max(80)
});

export const GetHashtagFeedQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
