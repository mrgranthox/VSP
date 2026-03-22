import { type NotificationChannel } from "@prisma/client";
import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import type { PaginationInput } from "../../lib/pagination";
import { paginated, success } from "../../lib/response";
import { NotificationsService } from "./notifications.service";

class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService = new NotificationsService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const query = req.query as unknown as PaginationInput & { isRead?: boolean; channel?: NotificationChannel };
    const result = await this.notificationsService.listNotifications(
      req.actor,
      {
        isRead: query.isRead,
        channel: query.channel
      },
      query
    );

    res.status(200).json(
      paginated(result.data, result.pagination, {
        requestId: this.getRequestId(req),
        unreadCount: result.unreadCount
      })
    );
  };

  getOne = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.notificationsService.getNotification(req.actor, req.params.notificationId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.notificationsService.markRead(req.actor, req.params.notificationId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.notificationsService.markAllRead(req.actor);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  getPreferences = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.notificationsService.getPreferences(req.actor);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  updatePreferences = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.notificationsService.updatePreferences(req.actor, req.body);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  registerPushDevice = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.notificationsService.registerPushDevice(req.actor, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  deletePushDevice = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.notificationsService.deletePushDevice(req.actor, req.params.deviceId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };
}

const notificationsController = new NotificationsController();

export { NotificationsController, notificationsController };
