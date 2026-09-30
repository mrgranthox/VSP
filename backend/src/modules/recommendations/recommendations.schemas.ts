import { z } from "zod";

export const CreateRecommendationBody = z.object({
  recipientUserId: z.string().uuid(),
  relationship: z.string().min(2).max(120),
  text: z.string().min(10).max(2000)
});

export const UpdateRecommendationStatusBody = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "HIDDEN"])
});

export const RecommendationIdParam = z.object({
  id: z.string().uuid()
});

export const UserIdParam = z.object({
  userId: z.string().uuid()
});
