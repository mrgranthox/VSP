import { z } from "zod";

const TicketIdParams = z.object({
  ticketId: z.string().uuid()
});

const SupportTicketsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const CreateSupportTicketBody = z
  .object({
    subject: z.string().min(5).max(180).trim(),
    body: z.string().min(10).max(10000),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    relatedEntityType: z.enum(["booking", "service_request", "user", "worker", "payment"]).optional(),
    relatedEntityId: z.string().uuid().optional()
  })
  .strict()
  .refine((data) => !data.relatedEntityId || data.relatedEntityType !== undefined, {
    message: "relatedEntityType required when relatedEntityId is provided"
  });

const AddTicketMessageBody = z
  .object({
    body: z.string().min(1).max(10000),
    isInternalNote: z.boolean().default(false)
  })
  .strict();

const UpdateTicketBody = z
  .object({
    status: z.enum(["OPEN", "ASSIGNED", "WAITING_USER", "WAITING_INTERNAL", "RESOLVED", "CLOSED"]).optional()
  })
  .strict();

export { AddTicketMessageBody, CreateSupportTicketBody, SupportTicketsQuery, TicketIdParams, UpdateTicketBody };
