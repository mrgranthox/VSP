import { Queue, QueueEvents, type JobsOptions } from "bullmq";

import { getBullMqConnectionOptions, getBullMqPrefix } from "../lib/redis";

type EventPayload = Record<string, unknown>;

type QueueName = "notifications" | "analytics" | "search" | "billing" | "moderation" | "media" | "media-video" | "maintenance";

let queueConnection: ReturnType<typeof getBullMqConnectionOptions> | null = null;
let queues: Record<QueueName, Queue<QueueJobData>> | null = null;

const getQueueConnection = () => {
  if (!queueConnection) {
    queueConnection = getBullMqConnectionOptions();
  }

  return queueConnection;
};

const getQueues = (): Record<QueueName, Queue<QueueJobData>> => {
  if (!queues) {
    const connection = getQueueConnection();
    const prefix = getBullMqPrefix();
    queues = {
      notifications: new Queue("notifications", { connection, prefix }),
      analytics: new Queue("analytics", { connection, prefix }),
      search: new Queue("search", { connection, prefix }),
      billing: new Queue("billing", { connection, prefix }),
      moderation: new Queue("moderation", { connection, prefix }),
      media: new Queue("media", { connection, prefix }),
      "media-video": new Queue("media-video", { connection, prefix }),
      maintenance: new Queue("maintenance", { connection, prefix })
    };
  }

  return queues;
};

const defaultEventJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 1_000
  },
  removeOnComplete: 1_000,
  removeOnFail: 5_000
};

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  removeOnComplete: 1_000,
  removeOnFail: 5_000
};

const routeEvent = (queueName: QueueName, opts?: JobsOptions) => ({
  queueName,
  opts: {
    ...defaultEventJobOptions,
    ...opts
  }
});

const domainEventRoutes: Record<string, Array<ReturnType<typeof routeEvent>>> = {
  USER_REGISTERED: [routeEvent("notifications"), routeEvent("analytics", { attempts: 3 })],
  USER_DELETION_REQUESTED: [routeEvent("search"), routeEvent("analytics", { attempts: 3 })],
  WORKER_PROFILE_CREATED: [routeEvent("search"), routeEvent("analytics", { attempts: 3 })],
  WORKER_PROFILE_UPDATED: [routeEvent("search")],
  WORKER_VERIFICATION_SUBMITTED: [routeEvent("analytics", { attempts: 3 })],
  REQUEST_CREATED: [routeEvent("analytics", { attempts: 3 })],
  REQUEST_ASSIGNED: [routeEvent("notifications"), routeEvent("analytics", { attempts: 3 })],
  REQUEST_ACCEPTED: [routeEvent("analytics", { attempts: 3 })],
  MESSAGE_SENT: [routeEvent("notifications"), routeEvent("analytics", { attempts: 3 })],
  BOOKING_CONFIRMED: [routeEvent("notifications"), routeEvent("analytics", { attempts: 3 })],
  BOOKING_COMPLETED: [routeEvent("search"), routeEvent("analytics", { attempts: 3 })],
  BOOKING_RESCHEDULE_REQUESTED: [routeEvent("notifications"), routeEvent("analytics", { attempts: 3 })],
  BOOKING_RESCHEDULE_RESPONDED: [routeEvent("notifications"), routeEvent("analytics", { attempts: 3 })],
  BOOKING_CANCELLED: [routeEvent("notifications"), routeEvent("analytics", { attempts: 3 })],
  REVIEW_SUBMITTED: [routeEvent("search"), routeEvent("notifications"), routeEvent("analytics", { attempts: 3 })],
  FRAUD_SIGNAL_CREATED: [routeEvent("moderation"), routeEvent("analytics", { attempts: 3 })],
  FEATURE_SUBSCRIPTION_STARTED: [routeEvent("search"), routeEvent("analytics", { attempts: 3 })],
  MFA_ENABLED: [routeEvent("analytics", { attempts: 3 })],
  MFA_DISABLED: [routeEvent("analytics", { attempts: 3 })]
};

const MANUAL_JOB_NAMES = [
  "notification_fanout",
  "analytics_rollup",
  "subscription_expiry_check",
  "fraud_signal_evaluator",
  "search_reindex_full",
  "audit_integrity_check",
  "token_cleanup",
  "partition_create",
  "media_process_image",
  "media_process_video",
  "pending_media_cleanup"
] as const;

const RECURRING_JOB_NAMES = [
  "notification_fanout",
  "analytics_rollup",
  "subscription_expiry_check",
  "fraud_signal_evaluator",
  "search_reindex_full",
  "audit_integrity_check",
  "token_cleanup",
  "partition_create",
  "pending_media_cleanup"
] as const;

type NamedJobName = (typeof MANUAL_JOB_NAMES)[number];

type QueuedEventData = {
  kind: "event";
  eventName: string;
  payload: EventPayload;
  emittedAt: string;
};

type QueuedNamedJobData = {
  kind: "job";
  jobName: NamedJobName;
  payload: Record<string, unknown>;
  triggeredBy: "manual" | "schedule" | "system";
};

type QueueJobData = QueuedEventData | QueuedNamedJobData;

const namedJobQueues: Record<NamedJobName, QueueName> = {
  notification_fanout: "notifications",
  analytics_rollup: "analytics",
  subscription_expiry_check: "billing",
  fraud_signal_evaluator: "moderation",
  search_reindex_full: "search",
  audit_integrity_check: "maintenance",
  token_cleanup: "maintenance",
  partition_create: "maintenance",
  media_process_image: "media",
  media_process_video: "media-video",
  pending_media_cleanup: "maintenance"
};

const recurringJobSchedules: Record<(typeof RECURRING_JOB_NAMES)[number], string> = {
  notification_fanout: process.env.CRON_NOTIFICATION_FANOUT ?? "*/5 * * * *",
  analytics_rollup: process.env.CRON_ANALYTICS_ROLLUP ?? "0 * * * *",
  subscription_expiry_check: process.env.CRON_SUBSCRIPTION_EXPIRY ?? "*/15 * * * *",
  fraud_signal_evaluator: process.env.CRON_FRAUD_EVALUATOR ?? "0 * * * *",
  search_reindex_full: process.env.CRON_SEARCH_REINDEX ?? "0 2 * * *",
  audit_integrity_check: process.env.CRON_AUDIT_INTEGRITY ?? "0 3 * * *",
  token_cleanup: process.env.CRON_TOKEN_CLEANUP ?? "0 4 * * *",
  partition_create: process.env.CRON_PARTITION_CREATE ?? "0 1 1 * *",
  pending_media_cleanup: process.env.CRON_PENDING_MEDIA_CLEANUP ?? "*/10 * * * *"
};

const getQueueForNamedJob = (jobName: NamedJobName) => getQueues()[namedJobQueues[jobName]];
const getQueueNameForNamedJob = (jobName: NamedJobName): QueueName => namedJobQueues[jobName];

const addDomainEventJobs = async (eventName: string, payload: EventPayload): Promise<void> => {
  const routes = domainEventRoutes[eventName] ?? [routeEvent("analytics", { attempts: 3 })];
  const queueMap = getQueues();

  await Promise.all(
    routes.map(({ queueName, opts }) =>
      queueMap[queueName].add(eventName, {
        kind: "event",
        eventName,
        payload,
        emittedAt: new Date().toISOString()
      } satisfies QueuedEventData, opts)
    )
  );
};

const enqueueNamedJob = async (
  jobName: NamedJobName,
  payload: Record<string, unknown> = {},
  triggeredBy: QueuedNamedJobData["triggeredBy"] = "manual",
  opts?: JobsOptions
) =>
  getQueueForNamedJob(jobName).add(
    jobName,
    {
      kind: "job",
      jobName,
      payload,
      triggeredBy
    } satisfies QueuedNamedJobData,
    {
      ...defaultJobOptions,
      ...opts
    }
  );

const enqueueNamedJobAndWait = async (
  jobName: NamedJobName,
  payload: Record<string, unknown> = {},
  triggeredBy: QueuedNamedJobData["triggeredBy"] = "manual"
): Promise<unknown> => {
  const queueName = namedJobQueues[jobName];
  const job = await enqueueNamedJob(jobName, payload, triggeredBy);
  const queueEvents = new QueueEvents(queueName, {
    connection: getBullMqConnectionOptions(),
    prefix: getBullMqPrefix()
  });

  await queueEvents.waitUntilReady();

  try {
    return await job.waitUntilFinished(queueEvents, 30_000);
  } finally {
    await queueEvents.close();
  }
};

const registerRecurringJobs = async (): Promise<void> => {
  await Promise.all(
    RECURRING_JOB_NAMES.map(async (jobName) => {
      const queue = getQueueForNamedJob(jobName);
      await queue.upsertJobScheduler(
        jobName,
        {
          pattern: recurringJobSchedules[jobName]
        },
        {
          name: jobName,
          data: {
            kind: "job",
            jobName,
            payload: {},
            triggeredBy: "schedule"
          } satisfies QueuedNamedJobData,
          opts: defaultJobOptions
        }
      );
    })
  );
};

const closeQueues = async (): Promise<void> => {
  if (!queues) {
    return;
  }

  await Promise.all(Object.values(queues).map((queue) => queue.close()));
  queues = null;

  if (queueConnection) {
    queueConnection = null;
  }
};

export {
  MANUAL_JOB_NAMES,
  addDomainEventJobs,
  closeQueues,
  enqueueNamedJob,
  enqueueNamedJobAndWait,
  getQueueNameForNamedJob,
  getQueueForNamedJob,
  getQueues,
  registerRecurringJobs,
  recurringJobSchedules
};
export type { NamedJobName, QueueJobData, QueueName };
