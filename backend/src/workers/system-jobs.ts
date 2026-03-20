import { JobRunStatus, Prisma, RequestStatus, SupportTicketStatus, UserStatus } from "@prisma/client";

import { publishUserEventIfOnline } from "../gateway/publisher";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { BillingService } from "../modules/billing/billing.service";
import { MediaRepository } from "../modules/media/media.repository";
import { MediaProcessor } from "../modules/media/media.processor";
import { AnalyticsRepository } from "../modules/analytics/analytics.repository";
import { SearchIndexer } from "../modules/search/search.indexer";
import { WorkerProfilesRepository } from "../modules/worker-profiles/worker-profiles.repository";
import type { NamedJobName, QueueName } from "../queues";

const toJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

const decimalToNumber = (value: Prisma.Decimal | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  return value.toNumber();
};

const getDatePayload = (value: unknown, fallback: Date): Date => {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const getNumericConfig = async (configKey: string, fallback: number): Promise<number> => {
  const config = await prisma.systemConfig.findUnique({
    where: {
      configKey
    },
    select: {
      valueJson: true
    }
  });

  const value = config?.valueJson;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = (value as Record<string, unknown>).value;

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }

    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
};

const runWithJobLedger = async <T>(
  jobName: string,
  queueName: QueueName,
  metadata: Record<string, unknown>,
  handler: () => Promise<T>
): Promise<{ jobRunId: string; result: T }> => {
  const jobRun = await prisma.jobRun.create({
    data: {
      jobName,
      queueName,
      status: JobRunStatus.STARTED,
      metadataJson: toJson(metadata)
    }
  });

  try {
    const result = await handler();
    await prisma.jobRun.update({
      where: {
        id: jobRun.id
      },
      data: {
        status: JobRunStatus.SUCCEEDED,
        finishedAt: new Date(),
        metadataJson: toJson({
          ...metadata,
          result
        })
      }
    });

    return {
      jobRunId: jobRun.id,
      result
    };
  } catch (error) {
    await prisma.jobRun.update({
      where: {
        id: jobRun.id
      },
      data: {
        status: JobRunStatus.FAILED,
        finishedAt: new Date(),
        metadataJson: toJson({
          ...metadata,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    });
    throw error;
  }
};

const runAnalyticsRollup = async (payload: Record<string, unknown>) => {
  const repository = new AnalyticsRepository();
  const windowEnd = getDatePayload(payload.windowEnd, new Date());
  const windowStart = getDatePayload(payload.windowStart, new Date(windowEnd.getTime() - 60 * 60 * 1000));
  const grouped = await repository.groupAnalyticsEventsByName({
    createdAt: {
      gte: windowStart,
      lt: windowEnd
    }
  });

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    events: grouped.map((entry) => ({
      eventName: entry.eventName,
      count: entry._count._all
    }))
  };
};

const runSubscriptionExpiryCheck = async () => {
  const billingService = new BillingService();
  const now = new Date();
  const supportAutoCloseDays = await getNumericConfig("support_ticket_auto_close_days", 7);
  const supportCloseBefore = new Date(now.getTime() - supportAutoCloseDays * 24 * 60 * 60 * 1000);

  const [expiredSubscriptions, expiryWarnings, expirableRequests] = await Promise.all([
    billingService.expireSubscriptions(),
    billingService.sendExpiryWarnings(),
    prisma.serviceRequest.findMany({
      where: {
        expiresAt: {
          lt: now
        },
        status: {
          in: [RequestStatus.OPEN, RequestStatus.MATCHED]
        }
      },
      select: {
        id: true,
        status: true
      }
    })
  ]);

  const [expiredRequests, autoClosedTickets] = await prisma.$transaction(async (tx) => {
    if (expirableRequests.length > 0) {
      await tx.serviceRequest.updateMany({
        where: {
          id: {
            in: expirableRequests.map((request) => request.id)
          }
        },
        data: {
          status: RequestStatus.EXPIRED
        }
      });

      await tx.serviceRequestStatusHistory.createMany({
        data: expirableRequests.map((request) => ({
          serviceRequestId: request.id,
          fromStatus: request.status,
          toStatus: RequestStatus.EXPIRED
        }))
      });
    }

    const closedTickets = await tx.supportTicket.updateMany({
      where: {
        status: SupportTicketStatus.RESOLVED,
        updatedAt: {
          lt: supportCloseBefore
        }
      },
      data: {
        status: SupportTicketStatus.CLOSED
      }
    });

    return [expirableRequests.length, closedTickets.count] as const;
  });

  return {
    expiredSubscriptions,
    expiryWarnings,
    expiredRequests,
    autoClosedTickets
  };
};

const runFraudSignalEvaluator = async (payload: Record<string, unknown>) => {
  const moderationThreshold = await getNumericConfig("fraud_score_moderation_threshold", 70);
  const autoSuspendThreshold = await getNumericConfig("fraud_score_auto_suspend_threshold", 90);
  const targetUserId = typeof payload.userId === "string" ? payload.userId : undefined;

  const groupedSignals = await prisma.fraudSignal.groupBy({
    by: ["userId"],
    where: {
      status: "OPEN",
      ...(targetUserId ? { userId: targetUserId } : {})
    },
    _sum: {
      score: true
    },
    _count: {
      _all: true
    }
  });

  let moderationCasesCreated = 0;
  let suspendedUsers = 0;

  for (const groupedSignal of groupedSignals) {
    if (!groupedSignal.userId) {
      continue;
    }

    const totalScore = decimalToNumber(groupedSignal._sum.score ?? 0);

    if (targetUserId && totalScore >= moderationThreshold) {
      await prisma.moderationCase.create({
        data: {}
      });
      moderationCasesCreated += 1;
    }

    if (totalScore >= autoSuspendThreshold) {
      const result = await prisma.user.updateMany({
        where: {
          id: groupedSignal.userId,
          status: UserStatus.ACTIVE
        },
        data: {
          status: UserStatus.SUSPENDED
        }
      });
      suspendedUsers += result.count;
    }
  }

  return {
    evaluatedUsers: groupedSignals.length,
    flaggedUsers: groupedSignals.filter((item) => decimalToNumber(item._sum.score ?? 0) >= moderationThreshold).length,
    moderationCasesCreated,
    suspendedUsers
  };
};

const runSearchReindexFull = async () => {
  const repository = new AnalyticsRepository();
  const indexer = new SearchIndexer();
  const workerProfileIds = await repository.listApprovedWorkerProfileIds();

  for (const workerProfileId of workerProfileIds) {
    await indexer.indexWorker(workerProfileId);
  }

  return {
    indexedWorkers: workerProfileIds.length
  };
};

const runAuditIntegrityCheck = async () => {
  const repository = new WorkerProfilesRepository();
  const workerProfiles = await prisma.workerProfile.findMany({
    select: {
      id: true,
      avgRating: true,
      totalReviews: true,
      jobsCompleted: true
    }
  });

  let correctedWorkers = 0;

  for (const workerProfile of workerProfiles) {
    const recalculated = await repository.recalculateAggregates(workerProfile.id);
    const avgRatingBefore = decimalToNumber(workerProfile.avgRating ?? 0);
    const avgRatingAfter = decimalToNumber(recalculated.avgRating ?? 0);

    if (
      avgRatingBefore !== avgRatingAfter ||
      workerProfile.totalReviews !== recalculated.totalReviews ||
      workerProfile.jobsCompleted !== recalculated.jobsCompleted
    ) {
      correctedWorkers += 1;
      logger.warn({ workerProfileId: workerProfile.id }, "Audit integrity check corrected worker aggregate drift");
    }
  }

  return {
    scannedWorkers: workerProfiles.length,
    correctedWorkers
  };
};

const runTokenCleanup = async () => {
  const now = new Date();
  const staleDays = Number.parseInt(process.env.PUSH_STALE_TOKEN_DAYS ?? "30", 10);
  const staleBefore = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);

  const [sessions, pushDevices, idempotencyKeys] = await prisma.$transaction([
    prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      }
    }),
    prisma.pushDevice.deleteMany({
      where: {
        lastSeenAt: {
          lt: staleBefore
        }
      }
    }),
    prisma.apiIdempotencyKey.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })
  ]);

  return {
    deletedSessions: sessions.count,
    deletedPushDevices: pushDevices.count,
    deletedIdempotencyKeys: idempotencyKeys.count
  };
};

const runPartitionCreate = async () => ({
  created: false,
  partitionedTables: ["analytics_events", "messages", "notifications", "search_impressions", "audit_logs"],
  reason: "Physical partitions are not enabled in this Prisma scaffold"
});

const runNotificationFanout = async (payload: Record<string, unknown>) => {
  const notificationId = typeof payload.notificationId === "string" ? payload.notificationId : null;

  if (!notificationId) {
    return {
      deliveredViaWs: false,
      notificationId: null
    };
  }

  const notification = await prisma.notification.findUnique({
    where: {
      id: notificationId
    }
  });

  if (!notification) {
    return {
      deliveredViaWs: false,
      notificationId
    };
  }

  const deliveredViaWs = await publishUserEventIfOnline(notification.userId, "notification.created", {
    notificationId: notification.id,
    notificationType: notification.notificationType,
    payloadJson: notification.payloadJson as Record<string, unknown>
  });

  return {
    deliveredViaWs,
    notificationId
  };
};

const runMediaProcessImage = async (payload: Record<string, unknown>) => {
  const mediaId = typeof payload.mediaId === "string" ? payload.mediaId : null;

  if (!mediaId) {
    return {
      processed: false,
      mediaId: null
    };
  }

  const processor = new MediaProcessor();
  const asset = await processor.processMediaAsset(mediaId);

  return {
    processed: Boolean(asset),
    mediaId
  };
};

const runMediaProcessVideo = async (payload: Record<string, unknown>) => runMediaProcessImage(payload);

const runPendingMediaCleanup = async () => {
  const repository = new MediaRepository();
  const ttlSeconds = Number.parseInt(process.env.STORAGE_PENDING_MEDIA_TTL_SECONDS ?? "1800", 10);
  const cutoff = new Date(Date.now() - ttlSeconds * 1000);
  const expiredCount = await repository.expirePendingUploads(cutoff);

  return {
    expiredCount
  };
};

const executeNamedJob = async (jobName: NamedJobName, payload: Record<string, unknown>) => {
  switch (jobName) {
    case "notification_fanout":
      return runNotificationFanout(payload);
    case "analytics_rollup":
      return runAnalyticsRollup(payload);
    case "subscription_expiry_check":
      return runSubscriptionExpiryCheck();
    case "fraud_signal_evaluator":
      return runFraudSignalEvaluator(payload);
    case "search_reindex_full":
      return runSearchReindexFull();
    case "audit_integrity_check":
      return runAuditIntegrityCheck();
    case "token_cleanup":
      return runTokenCleanup();
    case "partition_create":
      return runPartitionCreate();
    case "media_process_image":
      return runMediaProcessImage(payload);
    case "media_process_video":
      return runMediaProcessVideo(payload);
    case "pending_media_cleanup":
      return runPendingMediaCleanup();
  }
};

const runNamedJobNow = async (
  jobName: NamedJobName,
  payload: Record<string, unknown>,
  queueName: QueueName,
  trigger: "manual" | "schedule" | "system" = "manual",
  metadata: Record<string, unknown> = {}
) => runWithJobLedger(jobName, queueName, { payload, trigger, ...metadata }, () => executeNamedJob(jobName, payload));

export { runNamedJobNow, runWithJobLedger, toJson, executeNamedJob };
