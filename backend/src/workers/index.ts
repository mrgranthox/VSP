import { Worker, type Job } from "bullmq";

import { sendOperationalAlert } from "../lib/alerts";
import { captureException } from "../lib/errorReporting";
import { logger } from "../lib/logger";
import { recordBackgroundJobResult } from "../lib/metrics";
import { getBullMqConnectionOptions, getBullMqPrefix } from "../lib/redis";
import { runWithExtractedTraceContext, setSpanAttributes, SpanKind, withActiveSpan } from "../lib/tracing";
import { closeQueues, getQueueForNamedJob, getQueues, registerRecurringJobs, type NamedJobName, type QueueJobData, type QueueName } from "../queues";
import { runEventJob } from "./event-processors";
import { runNamedJobNow } from "./system-jobs";

const workerConcurrency: Record<QueueName, number> = {
  notifications: 10,
  analytics: 2,
  search: 4,
  billing: 1,
  moderation: 4,
  media: 4,
  "media-video": 2,
  maintenance: 1
};

let activeWorkers: Worker<QueueJobData>[] = [];
let workersStarted = false;

const processQueueJob = async (queueName: QueueName, job: Job<QueueJobData>) => {
  return runWithExtractedTraceContext(job.data.traceContext, async () =>
    withActiveSpan(
      "bullmq.job.process",
      {
        kind: SpanKind.CONSUMER
      },
      async (span) => {
        setSpanAttributes(span, {
          "messaging.system": "bullmq",
          "messaging.destination.name": queueName,
          "messaging.operation": "process",
          "vsp.job.name": job.name,
          "vsp.job.kind": job.data.kind,
          "vsp.job.id": job.id ?? undefined,
          "vsp.request.id": job.data.traceContext?.requestId
        });

        if (job.data.kind === "event") {
          return runEventJob(queueName, job.data.eventName, job.data.payload, {
            bullmqJobId: job.id,
            emittedAt: job.data.emittedAt,
            traceContext: job.data.traceContext ?? null
          });
        }

        return runNamedJobNow(job.data.jobName, job.data.payload, queueName, job.data.triggeredBy, {
          bullmqJobId: job.id,
          traceContext: job.data.traceContext ?? null
        });
      }
    )
  );
};

const createWorker = (queueName: QueueName) => {
  const worker = new Worker<QueueJobData>(queueName, (job) => processQueueJob(queueName, job), {
    connection: getBullMqConnectionOptions(),
    prefix: getBullMqPrefix(),
    concurrency: workerConcurrency[queueName]
  });

  worker.on("completed", (job) => {
    const durationSeconds =
      typeof job.processedOn === "number" && typeof job.finishedOn === "number"
        ? Math.max(0, (job.finishedOn - job.processedOn) / 1_000)
        : undefined;

    recordBackgroundJobResult({
      queue: queueName,
      jobName: job.name,
      result: "completed",
      durationSeconds
    });
    logger.info({ queueName, jobId: job.id, jobName: job.name }, "Background job completed");
  });

  worker.on("failed", (job, error) => {
    const attemptsMade = job?.attemptsMade ?? 1;
    const maxAttempts = job?.opts.attempts ?? 1;
    const durationSeconds =
      typeof job?.processedOn === "number" && typeof job.finishedOn === "number"
        ? Math.max(0, (job.finishedOn - job.processedOn) / 1_000)
        : undefined;

    recordBackgroundJobResult({
      queue: queueName,
      jobName: job?.name ?? "unknown",
      result: "failed",
      durationSeconds
    });

    logger.error(
      {
        queueName,
        jobId: job?.id,
        jobName: job?.name,
        attemptsMade,
        maxAttempts,
        error: error.message
      },
      "Background job failed"
    );

    if (attemptsMade >= maxAttempts) {
      captureException(error, {
        component: `worker:${queueName}`,
        tags: {
          queue_name: queueName,
          job_name: job?.name ?? "unknown",
          phase: "job_failed_final"
        },
        extra: {
          queueName,
          jobId: job?.id ?? null,
          attemptsMade,
          maxAttempts
        }
      });
      void sendOperationalAlert({
        severity: "critical",
        component: `worker:${queueName}`,
        summary: `Background job ${job?.name ?? "unknown"} exhausted retries`,
        details: {
          queueName,
          jobId: job?.id ?? null,
          jobName: job?.name ?? null,
          attemptsMade,
          maxAttempts,
          error: error.message
        }
      });
    }
  });

  worker.on("error", (error) => {
    captureException(error, {
      component: `worker:${queueName}`,
      tags: {
        queue_name: queueName,
        phase: "worker_runtime_error"
      }
    });
    logger.error({ queueName, error }, "Background worker runtime error");
    void sendOperationalAlert({
      severity: "critical",
      component: `worker:${queueName}`,
      summary: "Background worker runtime error",
      details: {
        queueName,
        message: error.message,
        stack: error.stack ?? null
      }
    });
  });

  return worker;
};

const startBackgroundWorkers = async (options?: { registerSchedulers?: boolean }) => {
  if (workersStarted) {
    return activeWorkers;
  }

  activeWorkers = (Object.keys(getQueues()) as QueueName[]).map((queueName) => createWorker(queueName));
  workersStarted = true;

  if (options?.registerSchedulers !== false) {
    await registerRecurringJobs();
  }

  logger.info({ queueCount: activeWorkers.length }, "Background workers started");

  return activeWorkers;
};

const stopBackgroundWorkers = async (): Promise<void> => {
  if (!workersStarted) {
    return;
  }

  await Promise.all(activeWorkers.map((worker) => worker.close()));
  activeWorkers = [];
  workersStarted = false;
  await closeQueues();
  logger.info("Background workers stopped");
};

const runNamedJobViaQueue = async (jobName: NamedJobName, payload: Record<string, unknown> = {}) => {
  const queue = getQueueForNamedJob(jobName);
  const job = await queue.add(jobName, {
    kind: "job",
    jobName,
    payload,
    triggeredBy: "manual"
  });

  return {
    jobId: job.id,
    queueName: queue.name
  };
};

export { runNamedJobViaQueue, startBackgroundWorkers, stopBackgroundWorkers };
