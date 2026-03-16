import { AnalyticsRepository } from "./analytics.repository";
import { getQueueNameForNamedJob, type NamedJobName } from "../../queues";
import { runNamedJobNow, toJson } from "../../workers/system-jobs";

class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository = new AnalyticsRepository()) {}

  async ingestEvents(
    actorUserId: string | undefined,
    data: {
      events: Array<{
        eventName: string;
        entityType?: string;
        entityId?: string;
        sessionId?: string;
        propsJson?: Record<string, unknown>;
      }>;
    }
  ) {
    await this.repository.createEvents(
      data.events.map((event) => ({
        userId: actorUserId,
        sessionId: event.sessionId,
        eventName: event.eventName,
        entityType: event.entityType,
        entityId: event.entityId,
        propsJson: toJson(event.propsJson ?? {})
      }))
    );

    return {
      accepted: data.events.length
    };
  }

  async runJob(jobName: NamedJobName, payload?: Record<string, unknown>) {
    return runNamedJobNow(jobName, payload ?? {}, getQueueNameForNamedJob(jobName));
  }
}

export { AnalyticsService };
