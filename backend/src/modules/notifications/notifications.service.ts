import { Prisma, type NotificationChannel } from "@prisma/client";

import { Errors } from "../../lib/errors";
import { publishUserEventIfOnline } from "../../gateway/publisher";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import { redis } from "../../lib/redis";
import type { ActorContext } from "../../types/actor";
import { NotificationsRepository } from "./notifications.repository";

const UNREAD_COUNT_TTL_SECONDS = 15;

const getDisplayName = (profile: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null | undefined): string | null =>
  profile?.displayName ?? ([profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || null);

class NotificationsService {
  constructor(private readonly repository: NotificationsRepository = new NotificationsRepository()) {}

  private getUnreadCountCacheKey(userId: string): string {
    return `notif:unread:${userId}`;
  }

  private async bustUnreadCountCache(userId: string): Promise<void> {
    await redis.del(this.getUnreadCountCacheKey(userId));
  }

  private async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = this.getUnreadCountCacheKey(userId);
    const cached = await redis.get(cacheKey);

    if (cached) {
      return Number.parseInt(cached, 10);
    }

    const count = await this.repository.countUnreadNotifications(userId);
    await redis.set(cacheKey, String(count), "EX", UNREAD_COUNT_TTL_SECONDS);

    return count;
  }

  private buildMessagePreview(message: { body: string | null; messageType: string }): string {
    const body = message.body?.trim();

    if (body) {
      return body.slice(0, 120);
    }

    return message.messageType === "TEXT" ? "" : `[${message.messageType.toLowerCase()}]`;
  }

  async listNotifications(
    actor: ActorContext,
    filters: { isRead?: boolean; channel?: NotificationChannel },
    pagination: PaginationInput
  ) {
    const args = getPaginationArgs(pagination);
    const [notifications, total, unreadCount] = await Promise.all([
      this.repository.listNotifications(actor.userId, filters, args.skip, args.take),
      this.repository.countNotifications(actor.userId, filters),
      this.getUnreadCount(actor.userId)
    ]);

    return {
      data: notifications,
      pagination: buildPagination(pagination.page, pagination.limit, total),
      unreadCount
    };
  }

  async getNotification(actor: ActorContext, notificationId: string) {
    const notification = await this.repository.getNotificationById(actor.userId, notificationId);

    if (!notification) {
      throw Errors.NOTIFICATION_NOT_FOUND();
    }

    return notification;
  }

  async markRead(actor: ActorContext, notificationId: string) {
    const notification = await this.repository.getNotificationById(actor.userId, notificationId);

    if (!notification) {
      throw Errors.NOTIFICATION_NOT_FOUND();
    }

    if (!notification.isRead) {
      await this.repository.markNotificationRead(notificationId);
      await this.bustUnreadCountCache(actor.userId);
    }

    return this.repository.getNotificationById(actor.userId, notificationId);
  }

  async markAllRead(actor: ActorContext) {
    const result = await this.repository.markAllNotificationsRead(actor.userId);
    await this.bustUnreadCountCache(actor.userId);

    return {
      updatedCount: result.count
    };
  }

  async getPreferences(actor: ActorContext) {
    return this.repository.ensureNotificationPreference(actor.userId);
  }

  async updatePreferences(
    actor: ActorContext,
    data: Partial<{
      chatPushEnabled: boolean;
      requestPushEnabled: boolean;
      marketingEmailEnabled: boolean;
      quietHoursStart: number | null;
      quietHoursEnd: number | null;
    }>
  ) {
    return this.repository.updateNotificationPreference(actor.userId, data);
  }

  async registerPushDevice(actor: ActorContext, data: { deviceToken: string; platform: "ios" | "android" | "web" }) {
    return this.repository.registerPushDevice(actor.userId, data);
  }

  async deletePushDevice(actor: ActorContext, deviceId: string): Promise<void> {
    const pushDevice = await this.repository.getPushDevice(actor.userId, deviceId);

    if (!pushDevice) {
      throw Errors.PUSH_DEVICE_NOT_FOUND();
    }

    await this.repository.deletePushDevice(deviceId);
  }

  async createInAppNotification(userId: string, notificationType: string, payloadJson: Prisma.InputJsonValue): Promise<void> {
    const notification = await this.repository.createNotification({
      userId,
      notificationType,
      payloadJson
    });
    await this.bustUnreadCountCache(userId);
    await publishUserEventIfOnline(userId, "notification.created", {
      notificationId: notification.id,
      notificationType: notification.notificationType,
      payloadJson: notification.payloadJson as Record<string, unknown>
    });
  }

  async notifyBookingConfirmed(data: { bookingId: string; customerUserId?: string }) {
    const booking = await this.repository.getBookingContext(data.bookingId);

    if (!booking) {
      return;
    }

    await this.createInAppNotification(booking.customerUserId, "BOOKING_CONFIRMED", {
      bookingId: booking.id,
      workerName: getDisplayName(booking.workerProfile.user.profile),
      workerAvatarUrl: booking.workerProfile.user.profile?.avatarUrl ?? null,
      scheduledStart: booking.scheduledStart.toISOString(),
      tradeName: booking.serviceRequest.tradeCategory?.name ?? null
    });
  }

  async notifyBookingCancelled(data: {
    bookingId: string;
    cancelledByUserId: string;
    reason?: string | null;
    scheduledStart?: string;
  }) {
    const booking = await this.repository.getBookingContext(data.bookingId);

    if (!booking) {
      return;
    }

    const workerUserId = booking.workerProfile.userId;
    const cancelledBy =
      data.cancelledByUserId === booking.customerUserId
        ? "customer"
        : data.cancelledByUserId === workerUserId
          ? "worker"
          : "admin";
    const recipients = [booking.customerUserId, workerUserId].filter((userId) => userId !== data.cancelledByUserId);

    await Promise.all(
      recipients.map((userId) =>
        this.createInAppNotification(userId, "BOOKING_CANCELLED", {
          bookingId: booking.id,
          cancelledBy,
          reason: data.reason ?? null,
          scheduledStart: data.scheduledStart ?? booking.scheduledStart.toISOString()
        })
      )
    );
  }

  async notifyRequestAssigned(data: { assignmentId: string }) {
    const assignment = await this.repository.getAssignmentContext(data.assignmentId);

    if (!assignment) {
      return;
    }

    await this.createInAppNotification(assignment.workerProfile.userId, "REQUEST_ASSIGNED", {
      requestId: assignment.serviceRequest.id,
      tradeName: assignment.serviceRequest.tradeCategory?.name ?? null,
      assignmentId: assignment.id,
      title: assignment.serviceRequest.title
    });
  }

  async notifyReviewReceived(data: { reviewId: string }) {
    const review = await this.repository.getReviewContext(data.reviewId);

    if (!review) {
      return;
    }

    await this.createInAppNotification(review.revieweeUserId, "REVIEW_RECEIVED", {
      reviewId: review.id,
      rating: review.rating,
      reviewerName: getDisplayName(review.reviewerUser.profile),
      reviewerAvatarUrl: review.reviewerUser.profile?.avatarUrl ?? null,
      reviewPreview: review.body?.slice(0, 160) ?? null
    });
  }

  async notifyMessageSent(data: { messageId: string; receiverIds: string[] }) {
    const message = await this.repository.getMessageContext(data.messageId);

    if (!message) {
      return;
    }

    await Promise.all(
      data.receiverIds.map((receiverId) =>
        this.createInAppNotification(receiverId, "NEW_MESSAGE", {
          conversationId: message.conversationId,
          messageId: message.id,
          senderName: getDisplayName(message.sender.profile),
          senderAvatarUrl: message.sender.profile?.avatarUrl ?? null,
          messagePreview: this.buildMessagePreview(message),
          messageType: message.messageType
        })
      )
    );
  }

  async notifyBookingRescheduleRequested(data: { rescheduleId: string }) {
    const reschedule = await this.repository.getRescheduleContext(data.rescheduleId);

    if (!reschedule) {
      return;
    }

    const recipients = [reschedule.booking.customerUserId, reschedule.booking.workerProfile.userId].filter(
      (userId) => userId !== reschedule.requestedByUserId
    );

    await Promise.all(
      recipients.map((userId) =>
        this.createInAppNotification(userId, "BOOKING_RESCHEDULE_REQUESTED", {
          bookingId: reschedule.bookingId,
          rescheduleId: reschedule.id,
          requestedByName: getDisplayName(reschedule.requestedByUser.profile),
          newStart: reschedule.newStart.toISOString(),
          newEnd: reschedule.newEnd.toISOString()
        })
      )
    );
  }

  async notifyBookingRescheduleResponded(data: { rescheduleId: string; action: "ACCEPTED" | "DECLINED" }) {
    const reschedule = await this.repository.getRescheduleContext(data.rescheduleId);

    if (!reschedule) {
      return;
    }

    await this.createInAppNotification(reschedule.requestedByUserId, "BOOKING_RESCHEDULE_RESPONDED", {
      bookingId: reschedule.bookingId,
      rescheduleId: reschedule.id,
      action: data.action
    });
  }
}

export { NotificationsService };
