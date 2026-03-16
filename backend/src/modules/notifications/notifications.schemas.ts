import { z } from "zod";

const GetNotificationsQuery = z.object({
  isRead: z.coerce.boolean().optional(),
  channel: z.enum(["IN_APP", "PUSH", "EMAIL", "SMS"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const NotificationIdParams = z.object({
  notificationId: z.string().uuid()
});

const UpdateNotificationPreferencesBody = z
  .object({
    chatPushEnabled: z.boolean().optional(),
    requestPushEnabled: z.boolean().optional(),
    marketingEmailEnabled: z.boolean().optional(),
    quietHoursStart: z.number().int().min(0).max(23).optional().nullable(),
    quietHoursEnd: z.number().int().min(0).max(23).optional().nullable()
  })
  .strict();

const RegisterPushDeviceBody = z
  .object({
    deviceToken: z.string().min(1).max(255),
    platform: z.enum(["ios", "android", "web"])
  })
  .strict();

const DeviceIdParams = z.object({
  deviceId: z.string().uuid()
});

export {
  DeviceIdParams,
  GetNotificationsQuery,
  NotificationIdParams,
  RegisterPushDeviceBody,
  UpdateNotificationPreferencesBody
};
