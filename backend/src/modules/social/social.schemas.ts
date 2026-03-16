import { z } from "zod";

const UUIDSchema = z.string().uuid();
const DateTimeSchema = z.string().datetime();
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const CreatePostBody = z
  .object({
    body: z.string().min(1).max(3000).trim(),
    visibility: z.enum(["PUBLIC", "CONNECTIONS", "PRIVATE"]).default("PUBLIC"),
    mediaRefs: z.array(z.string().min(1)).max(10).optional()
  })
  .strict();

const UpdatePostBody = z
  .object({
    body: z.string().min(1).max(3000).trim().optional(),
    visibility: z.enum(["PUBLIC", "CONNECTIONS", "PRIVATE"]).optional()
  })
  .strict();

const PostIdParams = z.object({
  postId: UUIDSchema
});

const GetFeedQuery = z
  .object({
    since: DateTimeSchema.optional()
  })
  .merge(PaginationSchema);

const AddPostMediaBody = z
  .object({
    mediaRef: z.string().min(1),
    mediaType: z.enum(["image", "video"])
  })
  .strict();

const MediaIdParams = z.object({
  postId: UUIDSchema,
  mediaId: UUIDSchema
});

const CreateCommentBody = z
  .object({
    body: z.string().min(1).max(1000).trim(),
    parentCommentId: UUIDSchema.optional()
  })
  .strict();

const UpdateCommentBody = z
  .object({
    body: z.string().min(1).max(1000).trim()
  })
  .strict();

const CommentIdParams = z.object({
  commentId: UUIDSchema
});

const GetCommentsQuery = PaginationSchema;

const ReportCommentBody = z
  .object({
    reason: z.string().min(5).max(255).trim(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM")
  })
  .strict();

export {
  AddPostMediaBody,
  CommentIdParams,
  CreateCommentBody,
  CreatePostBody,
  GetCommentsQuery,
  GetFeedQuery,
  MediaIdParams,
  PostIdParams,
  ReportCommentBody,
  UpdateCommentBody,
  UpdatePostBody
};
