# CROSS-CUTTING: Background Jobs (BullMQ)
# File: src/workers/
# All queues connect to Redis DB index: REDIS_QUEUE_DB (env, default 1)

## QUEUE INVENTORY
```typescript
// src/queues/index.ts
import { Queue } from 'bullmq';
import { redisConnection } from '../lib/redis';

export const notificationsQueue = new Queue('notifications', { connection: redisConnection });
export const analyticsQueue     = new Queue('analytics',     { connection: redisConnection });
export const searchQueue        = new Queue('search',        { connection: redisConnection });
export const billingQueue       = new Queue('billing',       { connection: redisConnection });
export const moderationQueue    = new Queue('moderation',    { connection: redisConnection });
export const mediaQueue         = new Queue('media',         { connection: redisConnection });
export const mediaVideoQueue    = new Queue('media-video',   { connection: redisConnection });
export const maintenanceQueue   = new Queue('maintenance',   { connection: redisConnection });
```

## JOB DEFINITIONS

### notification_fanout (queue: notifications — concurrency 10, attempts 5, backoff exponential)
Payload: { notificationId: string }
Action: load notification, check preferences + quiet hours, dispatch to FCM/APNs/SendGrid
Dead-letter: after 5 failures → mark delivery_failed, emit FRAUD_SIGNAL if pattern detected
Alert: if queue depth > 1000 for > 5 minutes

### analytics_rollup (queue: analytics — concurrency 2, attempts 3, backoff fixed 60s)
Schedule: CRON_ANALYTICS_ROLLUP (env, default: 0 * * * * = every hour)
Payload: { windowStart: string, windowEnd: string }
Action: aggregate analytics_events into hourly summary. Idempotent — safe to re-run.
Alert: if last successful run > 2 hours ago

### subscription_expiry_check (queue: billing — concurrency 1, attempts 3)
Schedule: CRON_SUBSCRIPTION_EXPIRY (env, default: */15 * * * *)
Payload: {}
Action: expire featured subscriptions + send 7-day warning notifications
Also: expire service requests past expiresAt, auto-close resolved support tickets

### fraud_signal_evaluator (queue: moderation — concurrency 4, attempts 5, backoff exponential)
Trigger: FRAUD_SIGNAL_CREATED event OR Schedule: CRON_FRAUD_EVALUATOR (env, default: 0 * * * *)
Payload: { userId?: string, signalId?: string }
Action: sum active fraud signal scores for user. If >= threshold → create ModerationCase.
  fraud_score_moderation_threshold=70 (system_config): create case
  fraud_score_auto_suspend_threshold=90 (system_config): create CRITICAL case, alert admin

### search_index_sync (queue: search — concurrency 4, attempts 5, backoff exponential)
Trigger: events WORKER_PROFILE_CREATED/UPDATED, REVIEW_SUBMITTED, BOOKING_COMPLETED, etc.
Payload: { workerProfileId: string, action: 'upsert'|'delete', fields?: string[] }
Action: update Typesense workers collection document

### search_reindex_full (queue: search — concurrency 1, attempts 2)
Schedule: CRON_SEARCH_REINDEX (env, default: 0 2 * * * = nightly 02:00 UTC)
Action: shadow collection rebuild (see search module for full algorithm)

### image_process (queue: media — concurrency 4, attempts 3, timeout 120s)
Payload: { mediaId: string, storageKey: string, category: string }
Action: ClamAV scan → Sharp processing → upload variants → update media record

### video_transcode (queue: media-video — concurrency 2, attempts 3, timeout 600s)
Payload: { mediaId: string, storageKey: string }
Action: ClamAV scan → ffprobe validation → FFmpeg transcode → poster → upload → update record
Memory: 4GB limit on worker-media-video pod

### audit_integrity_check (queue: maintenance — concurrency 1, attempts 2)
Schedule: CRON_AUDIT_INTEGRITY (env, default: 0 3 * * * = 03:00 UTC daily)
Action: verify worker aggregates match source tables. Recalculate and fix drift.
Log: discrepancies to audit_logs. Create FRAUD_SIGNAL if repeated drift on same worker.

### token_cleanup (queue: maintenance — concurrency 1)
Schedule: CRON_TOKEN_CLEANUP (env, default: 0 4 * * * = 04:00 UTC daily)
Action 1: DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '1 day'
Action 2: DELETE FROM push_devices WHERE last_seen_at < NOW() - PUSH_STALE_TOKEN_DAYS days
Action 3: DELETE FROM api_idempotency_keys WHERE expires_at < NOW()

### partition_create (queue: maintenance — concurrency 1)
Schedule: CRON_PARTITION_CREATE (env, default: 0 1 1 * * = 1st of month 01:00)
Action: create next month's partitions for: analytics_events, messages, notifications,
        search_impressions, audit_logs

## JOB RUN LEDGER
Every job writes to job_runs table on start and finish:
```typescript
// On job start:
await prisma.jobRun.create({
  data: { jobName, queueName, status: 'STARTED', startedAt: new Date() }
});
// On job finish:
await prisma.jobRun.update({
  where: { id: jobRunId },
  data: { status: 'SUCCEEDED'|'FAILED', finishedAt: new Date(), metadataJson: { ... } }
});
```

## EVENT BUS (emit after successful transactional writes)
```typescript
// src/lib/eventBus.ts
import { notificationsQueue, searchQueue, analyticsQueue, moderationQueue } from '../queues';

export const EventBus = {
  emit: async (eventName: string, payload: Record<string, any>) => {
    // Route to appropriate queue(s) based on event name
    const routes: Record<string, Queue[]> = {
      USER_REGISTERED:                [notificationsQueue, analyticsQueue],
      WORKER_PROFILE_CREATED:         [searchQueue, analyticsQueue],
      WORKER_PROFILE_UPDATED:         [searchQueue],
      WORKER_VERIFICATION_APPROVED:   [searchQueue, notificationsQueue, analyticsQueue],
      REVIEW_SUBMITTED:               [searchQueue, notificationsQueue, analyticsQueue],
      BOOKING_COMPLETED:              [searchQueue, notificationsQueue, analyticsQueue],
      BOOKING_CONFIRMED:              [notificationsQueue, analyticsQueue],
      REQUEST_CREATED:                [notificationsQueue, analyticsQueue],
      REQUEST_ACCEPTED:               [notificationsQueue, analyticsQueue],
      MESSAGE_SENT:                   [notificationsQueue, analyticsQueue],
      NOTIFICATION_CREATED:           [notificationsQueue],
      FRAUD_SIGNAL_CREATED:           [moderationQueue],
      FEATURE_SUBSCRIPTION_STARTED:   [searchQueue, notificationsQueue],
      WORKER_SUSPENDED:               [searchQueue],
    };
    const queues = routes[eventName] ?? [analyticsQueue];
    await Promise.all(queues.map(q => q.add(eventName, { eventName, payload, emittedAt: new Date().toISOString() })));
  }
};
```

## ERROR HANDLING PATTERN (all jobs)
```typescript
worker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, error: err.message }, 'Job failed');
  await prisma.jobRun.update({ where: { id: job?.data.jobRunId }, data: { status: 'FAILED', metadataJson: { error: err.message } } });
  // BullMQ handles retries automatically based on attempts config
});
```

## BULLMQ MONITORING
Install @bull-board/express for visual queue monitoring at /admin/queues (admin-only route).
