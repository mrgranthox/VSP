import { logger } from "../../lib/logger";
import { EventBus } from "../../lib/eventBus";
import { NotificationsService } from "./notifications.service";

let notificationsEventHandlersRegistered = false;

const registerNotificationsEventHandlers = (): void => {
  if (notificationsEventHandlersRegistered) {
    return;
  }

  notificationsEventHandlersRegistered = true;
  const notificationsService = new NotificationsService();

  EventBus.on("BOOKING_CONFIRMED", async (payload) => {
    const bookingId = typeof payload.bookingId === "string" ? payload.bookingId : null;

    if (!bookingId) {
      logger.warn({ payload }, "Skipping BOOKING_CONFIRMED notification because bookingId is missing");
      return;
    }

    await notificationsService.notifyBookingConfirmed({
      bookingId,
      customerUserId: typeof payload.customerUserId === "string" ? payload.customerUserId : undefined
    });
  });

  EventBus.on("BOOKING_CANCELLED", async (payload) => {
    const bookingId = typeof payload.bookingId === "string" ? payload.bookingId : null;
    const cancelledByUserId = typeof payload.cancelledByUserId === "string" ? payload.cancelledByUserId : null;

    if (!bookingId || !cancelledByUserId) {
      logger.warn({ payload }, "Skipping BOOKING_CANCELLED notification because payload is incomplete");
      return;
    }

    await notificationsService.notifyBookingCancelled({
      bookingId,
      cancelledByUserId,
      reason: typeof payload.reason === "string" ? payload.reason : null,
      scheduledStart: typeof payload.scheduledStart === "string" ? payload.scheduledStart : undefined
    });
  });

  EventBus.on("REQUEST_ASSIGNED", async (payload) => {
    const assignmentId = typeof payload.assignmentId === "string" ? payload.assignmentId : null;

    if (!assignmentId) {
      logger.warn({ payload }, "Skipping REQUEST_ASSIGNED notification because assignmentId is missing");
      return;
    }

    await notificationsService.notifyRequestAssigned({ assignmentId });
  });

  EventBus.on("REVIEW_SUBMITTED", async (payload) => {
    const reviewId = typeof payload.reviewId === "string" ? payload.reviewId : null;

    if (!reviewId) {
      logger.warn({ payload }, "Skipping REVIEW_SUBMITTED notification because reviewId is missing");
      return;
    }

    await notificationsService.notifyReviewReceived({ reviewId });
  });

  EventBus.on("MESSAGE_SENT", async (payload) => {
    const messageId = typeof payload.messageId === "string" ? payload.messageId : null;
    const receiverIds = Array.isArray(payload.receiverIds)
      ? payload.receiverIds.filter((value): value is string => typeof value === "string")
      : [];

    if (!messageId || receiverIds.length === 0) {
      logger.warn({ payload }, "Skipping MESSAGE_SENT notification because payload is incomplete");
      return;
    }

    await notificationsService.notifyMessageSent({
      messageId,
      receiverIds
    });
  });

  EventBus.on("BOOKING_RESCHEDULE_REQUESTED", async (payload) => {
    const rescheduleId = typeof payload.rescheduleId === "string" ? payload.rescheduleId : null;

    if (!rescheduleId) {
      logger.warn({ payload }, "Skipping BOOKING_RESCHEDULE_REQUESTED notification because rescheduleId is missing");
      return;
    }

    await notificationsService.notifyBookingRescheduleRequested({ rescheduleId });
  });

  EventBus.on("BOOKING_RESCHEDULE_RESPONDED", async (payload) => {
    const rescheduleId = typeof payload.rescheduleId === "string" ? payload.rescheduleId : null;
    const action =
      payload.action === "ACCEPTED" || payload.action === "DECLINED" ? payload.action : null;

    if (!rescheduleId || !action) {
      logger.warn({ payload }, "Skipping BOOKING_RESCHEDULE_RESPONDED notification because payload is incomplete");
      return;
    }

    await notificationsService.notifyBookingRescheduleResponded({
      rescheduleId,
      action
    });
  });
};

registerNotificationsEventHandlers();

export { registerNotificationsEventHandlers };
