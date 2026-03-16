import { type ModerationSeverity, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

class ModerationRepository {
  async getSystemConfig(configKey: string) {
    return prisma.systemConfig.findUnique({
      where: {
        configKey
      },
      select: {
        valueJson: true
      }
    });
  }

  async createReport(
    tx: Prisma.TransactionClient,
    data: {
      reporterUserId: string;
      entityType: string;
      entityId: string;
      reason: string;
      severity: ModerationSeverity;
    }
  ) {
    return tx.report.create({
      data
    });
  }

  async getModerationCaseByReportId(tx: Prisma.TransactionClient, reportId: string) {
    return tx.moderationCase.findFirst({
      where: {
        reportId
      },
      select: {
        id: true
      }
    });
  }

  async createModerationCase(
    tx: Prisma.TransactionClient,
    data: {
      reportId?: string;
    }
  ) {
    return tx.moderationCase.create({
      data
    });
  }

  async createFraudSignal(data: {
    userId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    signalKey: string;
    score: number;
  }) {
    return prisma.fraudSignal.create({
      data: {
        userId: data.userId ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        signalKey: data.signalKey,
        score: data.score
      }
    });
  }

  async findRecentFraudSignal(data: {
    userId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    signalKey: string;
    since: Date;
  }) {
    return prisma.fraudSignal.findFirst({
      where: {
        userId: data.userId ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        signalKey: data.signalKey,
        createdAt: {
          gte: data.since
        }
      },
      select: {
        id: true
      }
    });
  }
}

export { ModerationRepository };
