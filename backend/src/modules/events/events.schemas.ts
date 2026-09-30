import { z } from "zod";

export const CreateEventBody = z.object({
  title: z.string().min(5).max(160),
  description: z.string().min(10).max(4000),
  coverImageUrl: z.string().url().optional().nullable(),
  eventType: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).default("ONLINE"),
  location: z.string().max(200).optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional().nullable()
});

export const UpdateEventBody = CreateEventBody.partial();

export const GetEventsQuery = z.object({
  eventType: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]).optional(),
  query: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const EventRsvpBody = z.object({
  status: z.enum(["ATTENDING", "INTERESTED", "DECLINED"]).default("ATTENDING")
});

export const EventIdParam = z.object({
  id: z.string().uuid()
});
