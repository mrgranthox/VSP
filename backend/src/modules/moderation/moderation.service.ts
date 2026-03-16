import { ModerationSeverity } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { ModerationRepository } from "./moderation.repository";

const DEFAULT_FRAUD_SCORE_MODERATION_THRESHOLD = 70;
const DEFAULT_FRAUD_SCORE_AUTO_SUSPEND_THRESHOLD = 90;
const FRAUD_SIGNAL_CASE_DEDUP_WINDOW_HOURS = 24;

const severityScores: Record<ModerationSeverity, number> = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 100
};

class ModerationService {
  constructor(private readonly repository: ModerationRepository = new ModerationRepository()) {}

  private async getNumericConfig(configKey: string, fallback: number): Promise<number> {
    const config = await this.repository.getSystemConfig(configKey);
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
  }

  async createReport(data: {
    reporterUserId: string;
    entityType: string;
    entityId: string;
    reason: string;
    severity: ModerationSeverity;
  }) {
    const moderationThreshold = await this.getNumericConfig(
      "fraud_score_moderation_threshold",
      DEFAULT_FRAUD_SCORE_MODERATION_THRESHOLD
    );
    const severityScore = severityScores[data.severity];

    return prisma.$transaction(async (tx) => {
      const report = await this.repository.createReport(tx, data);
      let moderationCase: { id: string } | null = null;

      if (severityScore >= moderationThreshold) {
        moderationCase = await this.repository.getModerationCaseByReportId(tx, report.id);

        if (!moderationCase) {
          moderationCase = await this.repository.createModerationCase(tx, {
            reportId: report.id
          });
        }
      }

      return {
        report,
        moderationCase
      };
    });
  }

  async recordFraudSignal(data: {
    userId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    signalKey: string;
    score: number;
  }) {
    const [moderationThreshold, autoSuspendThreshold, recentSignal] = await Promise.all([
      this.getNumericConfig("fraud_score_moderation_threshold", DEFAULT_FRAUD_SCORE_MODERATION_THRESHOLD),
      this.getNumericConfig("fraud_score_auto_suspend_threshold", DEFAULT_FRAUD_SCORE_AUTO_SUSPEND_THRESHOLD),
      this.repository.findRecentFraudSignal({
        userId: data.userId ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        signalKey: data.signalKey,
        since: new Date(Date.now() - FRAUD_SIGNAL_CASE_DEDUP_WINDOW_HOURS * 60 * 60 * 1000)
      })
    ]);

    const signal = await this.repository.createFraudSignal(data);
    let moderationCase: { id: string } | null = null;

    if (!recentSignal && data.score >= moderationThreshold) {
      moderationCase = await prisma.moderationCase.create({
        data: {}
      });
    }

    return {
      signal,
      moderationCase,
      exceedsAutoSuspendThreshold: data.score >= autoSuspendThreshold
    };
  }
}

export { ModerationService };
