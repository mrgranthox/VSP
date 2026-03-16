import { z } from "zod";

const dimensionKeySchema = z.enum(["quality", "communication", "punctuality", "value"]);

const dimensionsArraySchema = z.array(
  z
    .object({
      dimensionKey: dimensionKeySchema,
      score: z.number().int().min(1).max(5)
    })
    .strict()
).max(4);

const uniqueDimensionsSchema = dimensionsArraySchema
  .max(4)
  .refine((dimensions) => new Set(dimensions.map((dimension) => dimension.dimensionKey)).size === dimensions.length, {
    message: "dimensionKey values must be unique"
  });

const requiredUniqueDimensionsSchema = dimensionsArraySchema.min(1).refine(
  (dimensions) => new Set(dimensions.map((dimension) => dimension.dimensionKey)).size === dimensions.length,
  {
    message: "dimensionKey values must be unique"
  }
);

const CreateReviewBody = z
  .object({
    bookingId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    body: z.string().max(2000).optional(),
    dimensions: uniqueDimensionsSchema.optional()
  })
  .strict();

const ReviewIdParams = z.object({
  reviewId: z.string().uuid()
});

const AddDimensionsBody = z
  .object({
    dimensions: requiredUniqueDimensionsSchema
  })
  .strict();

const CreateReviewReplyBody = z
  .object({
    body: z.string().min(1).max(1000).trim()
  })
  .strict();

const UpdateReviewReplyBody = z
  .object({
    body: z.string().min(1).max(1000).trim()
  })
  .strict();

const ReplyIdParams = z.object({
  reviewId: z.string().uuid(),
  replyId: z.string().uuid()
});

const GetWorkerReviewsParams = z.object({
  workerId: z.string().uuid()
});

const GetWorkerReviewsQuery = z.object({
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const ReportReviewBody = z
  .object({
    reason: z.string().min(5).max(255).trim(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM")
  })
  .strict();

export {
  AddDimensionsBody,
  CreateReviewBody,
  CreateReviewReplyBody,
  GetWorkerReviewsParams,
  GetWorkerReviewsQuery,
  ReplyIdParams,
  ReportReviewBody,
  ReviewIdParams,
  UpdateReviewReplyBody
};
