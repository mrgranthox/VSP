import { z } from "zod";

const requestIdSchema = z.string().uuid();
const futureDateTimeMessage = "scheduledAt must be future";

const RequestIdParams = z.object({
  requestId: requestIdSchema
});

const AssignmentIdParams = z.object({
  requestId: requestIdSchema,
  assignmentId: z.string().uuid()
});

const RequestItemParams = z.object({
  requestId: requestIdSchema,
  itemId: z.string().uuid()
});

const requestItemBodyShape = {
  label: z.string().min(1).max(150).trim(),
  quantity: z.number().int().min(1).max(999).default(1),
  note: z.string().max(500).optional()
};

const CreateServiceRequestBody = z
  .object({
    tradeCategoryId: z.string().uuid().optional(),
    preferredWorkerProfileId: z.string().uuid().optional(),
    title: z.string().min(5).max(200).trim(),
    description: z.string().min(10).max(5000),
    locationText: z.string().max(255).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    scheduledAt: z.string().datetime().optional(),
    items: z.array(z.object(requestItemBodyShape).strict()).max(20).optional()
  })
  .strict()
  .refine((data) => !data.scheduledAt || new Date(data.scheduledAt) > new Date(), {
    message: futureDateTimeMessage
  });

const UpdateServiceRequestBody = z
  .object({
    title: z.string().min(5).max(200).trim().optional(),
    description: z.string().min(10).max(5000).optional(),
    locationText: z.string().max(255).optional().nullable(),
    lat: z.coerce.number().min(-90).max(90).optional().nullable(),
    lng: z.coerce.number().min(-180).max(180).optional().nullable(),
    scheduledAt: z.string().datetime().optional().nullable()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  })
  .refine((data) => !data.scheduledAt || new Date(data.scheduledAt) > new Date(), {
    message: futureDateTimeMessage
  });

const GetServiceRequestsQuery = z.object({
  status: z.enum(["OPEN", "MATCHED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const CreateRequestItemBody = z.object(requestItemBodyShape).strict();

const UpdateRequestItemBody = z
  .object({
    label: z.string().min(1).max(150).trim().optional(),
    quantity: z.number().int().min(1).max(999).optional(),
    note: z.string().max(500).optional().nullable()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  });

const CreateAssignmentBody = z
  .object({
    workerProfileId: z.string().uuid()
  })
  .strict();

const CancelRequestBody = z
  .object({
    reason: z.string().max(255).optional()
  })
  .strict();

export {
  AssignmentIdParams,
  CancelRequestBody,
  CreateAssignmentBody,
  CreateRequestItemBody,
  CreateServiceRequestBody,
  GetServiceRequestsQuery,
  RequestIdParams,
  RequestItemParams,
  UpdateRequestItemBody,
  UpdateServiceRequestBody
};
