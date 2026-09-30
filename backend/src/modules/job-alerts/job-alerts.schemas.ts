import { z } from "zod";

export const CreateJobAlertBody = z.object({
  queryText: z.string().min(2).max(120),
  location: z.string().max(120).optional().nullable(),
  tradeCategoryId: z.string().uuid().optional().nullable(),
  frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY")
});

export const UpdateJobAlertBody = z.object({
  isActive: z.boolean().optional(),
  frequency: z.enum(["DAILY", "WEEKLY"]).optional()
});

export const AlertIdParam = z.object({
  id: z.string().uuid()
});
