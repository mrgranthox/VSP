import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { notificationsController } from "./notifications.controller";
import "./notifications.events";
import {
  DeviceIdParams,
  GetNotificationsQuery,
  NotificationIdParams,
  RegisterPushDeviceBody,
  UpdateNotificationPreferencesBody
} from "./notifications.schemas";

const notificationsRoutes = Router();

notificationsRoutes.get("/notifications", authenticate, validate(GetNotificationsQuery, "query"), notificationsController.list);
notificationsRoutes.post("/notifications/read-all", authenticate, notificationsController.markAllRead);
notificationsRoutes.post(
  "/notifications/:notificationId/read",
  authenticate,
  validate(NotificationIdParams, "params"),
  notificationsController.markRead
);
notificationsRoutes.get("/notifications/preferences", authenticate, notificationsController.getPreferences);
notificationsRoutes.patch(
  "/notifications/preferences",
  authenticate,
  validate(UpdateNotificationPreferencesBody),
  notificationsController.updatePreferences
);
notificationsRoutes.post("/push-devices", authenticate, validate(RegisterPushDeviceBody), notificationsController.registerPushDevice);
notificationsRoutes.delete(
  "/push-devices/:deviceId",
  authenticate,
  validate(DeviceIdParams, "params"),
  notificationsController.deletePushDevice
);

export { notificationsRoutes };
