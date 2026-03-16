import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { NotificationsService } from "../modules/notifications/notifications.service";
import { SearchService } from "../modules/search/search.service";
import { UsersRepository } from "../modules/users/users.repository";
import { ModerationService } from "../modules/moderation/moderation.service";
import type { QueueName } from "../queues";
import { runWithJobLedger, toJson } from "./system-jobs";

type EventPayload = Record<string, unknown>;

const notificationsService = new NotificationsService();
const searchService = new SearchService();
const usersRepository = new UsersRepository();
const moderationService = new ModerationService();

const getString = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value : undefined);

const processNotificationsEvent = async (eventName: string, payload: EventPayload) => {
  switch (eventName) {
    case "USER_REGISTERED": {
      const userId = getString(payload.userId);

      if (userId) {
        await usersRepository.ensureNotificationPreference(userId);
      }
      return { ensuredUserId: userId ?? null };
    }
    case "BOOKING_CONFIRMED": {
      const bookingId = getString(payload.bookingId);
      if (bookingId) {
        await notificationsService.notifyBookingConfirmed({
          bookingId,
          customerUserId: getString(payload.customerUserId)
        });
      }
      return { bookingId: bookingId ?? null };
    }
    case "BOOKING_CANCELLED": {
      const bookingId = getString(payload.bookingId);
      const cancelledByUserId = getString(payload.cancelledByUserId);

      if (bookingId && cancelledByUserId) {
        await notificationsService.notifyBookingCancelled({
          bookingId,
          cancelledByUserId,
          reason: getString(payload.reason) ?? null,
          scheduledStart: getString(payload.scheduledStart)
        });
      }
      return { bookingId: bookingId ?? null };
    }
    case "REQUEST_ASSIGNED": {
      const assignmentId = getString(payload.assignmentId);

      if (assignmentId) {
        await notificationsService.notifyRequestAssigned({ assignmentId });
      }
      return { assignmentId: assignmentId ?? null };
    }
    case "REVIEW_SUBMITTED": {
      const reviewId = getString(payload.reviewId);

      if (reviewId) {
        await notificationsService.notifyReviewReceived({ reviewId });
      }
      return { reviewId: reviewId ?? null };
    }
    case "MESSAGE_SENT": {
      const messageId = getString(payload.messageId);
      const receiverIds = Array.isArray(payload.receiverIds)
        ? payload.receiverIds.filter((value): value is string => typeof value === "string")
        : [];

      if (messageId && receiverIds.length > 0) {
        await notificationsService.notifyMessageSent({
          messageId,
          receiverIds
        });
      }
      return { messageId: messageId ?? null, receiverCount: receiverIds.length };
    }
    case "BOOKING_RESCHEDULE_REQUESTED": {
      const rescheduleId = getString(payload.rescheduleId);

      if (rescheduleId) {
        await notificationsService.notifyBookingRescheduleRequested({ rescheduleId });
      }
      return { rescheduleId: rescheduleId ?? null };
    }
    case "BOOKING_RESCHEDULE_RESPONDED": {
      const rescheduleId = getString(payload.rescheduleId);
      const action = payload.action === "ACCEPTED" || payload.action === "DECLINED" ? payload.action : null;

      if (rescheduleId && action) {
        await notificationsService.notifyBookingRescheduleResponded({
          rescheduleId,
          action
        });
      }
      return { rescheduleId: rescheduleId ?? null, action };
    }
    default:
      return { ignored: true };
  }
};

const processSearchEvent = async (eventName: string, payload: EventPayload) => {
  switch (eventName) {
    case "WORKER_PROFILE_CREATED":
    case "WORKER_PROFILE_UPDATED":
    case "REVIEW_SUBMITTED":
    case "BOOKING_COMPLETED":
    case "FEATURE_SUBSCRIPTION_STARTED": {
      const workerProfileId = getString(payload.workerProfileId);

      if (workerProfileId) {
        await searchService.refreshSearchIndex(workerProfileId);
      }
      return { workerProfileId: workerProfileId ?? null };
    }
    case "USER_DELETION_REQUESTED": {
      const userId = getString(payload.userId);

      if (userId) {
        await searchService.removeWorkerByUserId(userId);
      }
      return { userId: userId ?? null };
    }
    default:
      return { ignored: true };
  }
};

const processModerationEvent = async (eventName: string, payload: EventPayload) => {
  switch (eventName) {
    case "FRAUD_SIGNAL_CREATED": {
      const signalKey = getString(payload.signalKey);
      const score = typeof payload.score === "number" ? payload.score : Number(payload.score);

      if (signalKey && Number.isFinite(score)) {
        const result = await moderationService.recordFraudSignal({
          userId: getString(payload.userId) ?? null,
          entityType: getString(payload.entityType) ?? null,
          entityId: getString(payload.entityId) ?? null,
          signalKey,
          score
        });

        return {
          signalId: result.signal.id,
          moderationCaseId: result.moderationCase?.id ?? null
        };
      }

      return { ignored: true };
    }
    default:
      return { ignored: true };
  }
};

const processAnalyticsEvent = async (eventName: string, payload: EventPayload) => {
  await prisma.analyticsEvent.create({
    data: {
      eventName,
      entityType: "domain_event",
      propsJson: toJson(payload) as Prisma.InputJsonValue
    }
  });

  return {
    recorded: true
  };
};

const executeEventProcessor = async (queueName: QueueName, eventName: string, payload: EventPayload) => {
  switch (queueName) {
    case "notifications":
      return processNotificationsEvent(eventName, payload);
    case "search":
      return processSearchEvent(eventName, payload);
    case "moderation":
      return processModerationEvent(eventName, payload);
    case "analytics":
      return processAnalyticsEvent(eventName, payload);
    default:
      return { ignored: true };
  }
};

const runEventJob = async (queueName: QueueName, eventName: string, payload: EventPayload, metadata: Record<string, unknown>) =>
  runWithJobLedger(eventName, queueName, metadata, () => executeEventProcessor(queueName, eventName, payload));

export { runEventJob };
