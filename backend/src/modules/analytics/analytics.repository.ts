import { JobRunStatus, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

class AnalyticsRepository {
  async createEvents(data: Prisma.AnalyticsEventCreateManyInput[]) {
    return prisma.analyticsEvent.createMany({
      data
    });
  }

  async createJobRun(jobName: string, queueName: string, metadataJson?: Prisma.InputJsonValue) {
    return prisma.jobRun.create({
      data: {
        jobName,
        queueName,
        status: JobRunStatus.STARTED,
        metadataJson
      }
    });
  }

  async finishJobRun(jobRunId: string, status: JobRunStatus, metadataJson?: Prisma.InputJsonValue) {
    return prisma.jobRun.update({
      where: { id: jobRunId },
      data: {
        status,
        finishedAt: new Date(),
        metadataJson
      }
    });
  }

  async countAnalyticsEvents(where: Prisma.AnalyticsEventWhereInput) {
    return prisma.analyticsEvent.count({ where });
  }

  async groupAnalyticsEventsByName(where: Prisma.AnalyticsEventWhereInput) {
    return prisma.analyticsEvent.groupBy({
      by: ["eventName"],
      where,
      _count: {
        _all: true
      }
    });
  }

  async listApprovedWorkerProfileIds() {
    const records = await prisma.workerProfile.findMany({
      where: {
        verificationStatus: "APPROVED"
      },
      select: {
        id: true
      }
    });

    return records.map((record) => record.id);
  }

  async cleanupExpiredSessions(now: Date) {
    return prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });
  }

  async countOpenFraudSignals() {
    return prisma.fraudSignal.count({
      where: {
        status: "OPEN"
      }
    });
  }

  async countBrokenAdminAuditRefs() {
    return 0;
  }
}

export { AnalyticsRepository };
