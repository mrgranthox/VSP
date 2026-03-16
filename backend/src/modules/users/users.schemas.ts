import { z } from "zod";

const UUIDSchema = z.string().uuid("Must be a valid UUID");

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const UpdateUserMeBody = z
  .object({
    firstName: z.string().min(1).max(100).trim().optional(),
    lastName: z.string().min(1).max(100).trim().optional(),
    displayName: z.string().max(150).trim().optional().nullable(),
    bio: z.string().max(3000).optional().nullable(),
    cityId: UUIDSchema.optional().nullable(),
    lat: z.coerce.number().min(-90).max(90).optional().nullable(),
    lng: z.coerce.number().min(-180).max(180).optional().nullable()
  })
  .strict();

const UpdateNotificationPreferencesBody = z
  .object({
    chatPushEnabled: z.boolean().optional(),
    requestPushEnabled: z.boolean().optional(),
    marketingEmailEnabled: z.boolean().optional(),
    quietHoursStart: z.number().int().min(0).max(23).optional().nullable(),
    quietHoursEnd: z.number().int().min(0).max(23).optional().nullable()
  })
  .strict();

const AddFollowBody = z
  .object({
    targetType: z.enum(["USER", "WORKER"]),
    targetId: UUIDSchema
  })
  .strict();

const FollowParams = z.object({
  targetType: z.enum(["USER", "WORKER"]),
  targetId: UUIDSchema
});

const WorkerIdPathParam = z.object({ workerId: UUIDSchema });
const UserIdPathParam = z.object({ userId: UUIDSchema });

export {
  AddFollowBody,
  FollowParams,
  PaginationQuery,
  UpdateNotificationPreferencesBody,
  UpdateUserMeBody,
  UserIdPathParam,
  WorkerIdPathParam
};
