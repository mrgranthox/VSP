import { z } from "zod";

import { MANUAL_JOB_NAMES } from "../../queues";

const BatchAnalyticsEventsBody = z
  .object({
    events: z
      .array(
        z.object({
          eventName: z.string().min(1).max(120),
          entityType: z.string().max(50).optional(),
          entityId: z.string().uuid().optional(),
          sessionId: z.string().uuid().optional(),
          propsJson: z.record(z.unknown()).default({})
        })
      )
      .min(1)
      .max(100)
  })
  .strict();

const TriggerJobBody = z
  .object({
    jobName: z.enum(MANUAL_JOB_NAMES),
    payload: z.record(z.unknown()).optional()
  })
  .strict();

export { BatchAnalyticsEventsBody, TriggerJobBody };
