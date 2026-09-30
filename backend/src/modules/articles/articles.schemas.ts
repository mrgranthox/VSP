import { z } from "zod";

export const CreateArticleBody = z.object({
  title: z.string().min(5).max(200),
  body: z.string().min(20),
  coverImageUrl: z.string().url().optional().nullable(),
  readingTimeMinutes: z.number().int().min(1).max(60).default(3),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED")
});

export const UpdateArticleBody = CreateArticleBody.partial();

export const GetArticlesQuery = z.object({
  authorUserId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "REMOVED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const ArticleReactionBody = z.object({
  reactionType: z.enum(["LIKE", "CELEBRATE", "SUPPORT", "LOVE", "INSIGHTFUL", "FUNNY"]).default("LIKE")
});

export const CreateArticleCommentBody = z.object({
  body: z.string().min(1).max(2000),
  parentCommentId: z.string().uuid().optional().nullable()
});

export const ArticleIdParam = z.object({
  idOrSlug: z.string().min(1)
});

export const ArticleUuidParam = z.object({
  id: z.string().uuid()
});
