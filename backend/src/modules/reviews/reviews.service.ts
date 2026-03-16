import { BookingStatus, type ModerationSeverity } from "@prisma/client";

import { EventBus } from "../../lib/eventBus";
import { Errors } from "../../lib/errors";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import type { ActorContext } from "../../types/actor";
import { ModerationService } from "../moderation/moderation.service";
import { WorkerProfilesService } from "../worker-profiles/worker-profiles.service";
import { ReviewsRepository, type ReviewRecord } from "./reviews.repository";

const DEFAULT_REVIEW_WINDOW_HOURS = 168;

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const getDisplayName = (profile: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null | undefined): string | null =>
  profile?.displayName ?? ([profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || null);

class ReviewsService {
  constructor(
    private readonly repository: ReviewsRepository = new ReviewsRepository(),
    private readonly workerProfilesService: WorkerProfilesService = new WorkerProfilesService(),
    private readonly moderationService: ModerationService = new ModerationService()
  ) {}

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

    return fallback;
  }

  private mapUser(user: ReviewRecord["reviewerUser"] | ReviewRecord["revieweeUser"]) {
    return {
      userId: user.id,
      displayName: getDisplayName(user.profile),
      avatarUrl: user.profile?.avatarUrl ?? null
    };
  }

  private mapReply(reply: ReviewRecord["replies"][number]) {
    return {
      id: reply.id,
      reviewId: reply.reviewId,
      authorUserId: reply.authorUserId,
      body: reply.body,
      createdAt: reply.createdAt,
      author: this.mapUser(reply.authorUser)
    };
  }

  private mapReview(review: ReviewRecord) {
    return {
      id: review.id,
      bookingId: review.bookingId,
      reviewerUserId: review.reviewerUserId,
      revieweeUserId: review.revieweeUserId,
      rating: review.rating,
      body: review.body ?? null,
      createdAt: review.createdAt,
      booking: {
        id: review.booking.id,
        status: review.booking.status,
        completedAt: review.booking.completedAt,
        workerProfileId: review.booking.workerProfileId
      },
      reviewer: this.mapUser(review.reviewerUser),
      reviewee: this.mapUser(review.revieweeUser),
      dimensions: review.dimensionScores.map((dimension) => ({
        id: dimension.id,
        dimensionKey: dimension.dimensionKey,
        score: dimension.score
      })),
      replies: review.replies.map((reply) => this.mapReply(reply))
    };
  }

  async createReview(
    actor: ActorContext,
    data: {
      bookingId: string;
      rating: number;
      body?: string;
      dimensions?: Array<{ dimensionKey: "quality" | "communication" | "punctuality" | "value"; score: number }>;
    }
  ) {
    const booking = await this.repository.getBookingReviewContext(data.bookingId);

    if (!booking || booking.status !== BookingStatus.COMPLETED || !booking.completedAt) {
      throw Errors.REVIEW_NOT_ALLOWED();
    }

    if (booking.customerUserId !== actor.userId) {
      throw Errors.PERMISSION_DENIED();
    }

    const reviewWindowHours = await this.getNumericConfig("review_window_hours", DEFAULT_REVIEW_WINDOW_HOURS);
    const reviewWindowStart = Date.now() - reviewWindowHours * 60 * 60 * 1000;

    if (booking.completedAt.getTime() < reviewWindowStart) {
      throw Errors.REVIEW_NOT_ALLOWED();
    }

    if (booking.review) {
      throw Errors.REVIEW_NOT_ALLOWED();
    }

    if (!booking.workerProfile || booking.workerProfile.userId === actor.userId) {
      throw Errors.REVIEW_NOT_ALLOWED();
    }

    const review = await this.repository.createReview({
      bookingId: data.bookingId,
      reviewerUserId: actor.userId,
      revieweeUserId: booking.workerProfile.userId,
      rating: data.rating,
      body: data.body ? stripHtml(data.body) || null : null,
      dimensions: data.dimensions
    });

    await this.workerProfilesService.recalculateAggregates(booking.workerProfileId);
    await EventBus.emit("REVIEW_SUBMITTED", {
      reviewId: review.id,
      revieweeUserId: review.revieweeUserId,
      workerProfileId: booking.workerProfileId,
      rating: review.rating
    });

    return this.mapReview(review);
  }

  async getReview(reviewId: string) {
    const review = await this.repository.getReviewById(reviewId);

    if (!review) {
      throw Errors.REVIEW_NOT_FOUND();
    }

    return this.mapReview(review);
  }

  async getWorkerReviews(workerProfileId: string, filters: { minRating?: number }, pagination: PaginationInput) {
    const workerProfile = await this.repository.getWorkerProfile(workerProfileId);

    if (!workerProfile) {
      throw Errors.WORKER_PROFILE_NOT_FOUND();
    }

    const args = getPaginationArgs(pagination);
    const [reviews, total] = await Promise.all([
      this.repository.listWorkerReviews(workerProfile.userId, filters, args.skip, args.take),
      this.repository.countWorkerReviews(workerProfile.userId, filters)
    ]);

    return {
      data: reviews.map((review) => this.mapReview(review)),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async addDimensions(
    actor: ActorContext,
    reviewId: string,
    data: {
      dimensions: Array<{ dimensionKey: "quality" | "communication" | "punctuality" | "value"; score: number }>;
    }
  ) {
    const review = await this.repository.getReviewById(reviewId);

    if (!review) {
      throw Errors.REVIEW_NOT_FOUND();
    }

    if (review.reviewerUserId !== actor.userId) {
      throw Errors.PERMISSION_DENIED();
    }

    await this.repository.upsertDimensionScores(reviewId, data.dimensions);
    const refreshedReview = await this.repository.getReviewById(reviewId);

    if (!refreshedReview) {
      throw Errors.REVIEW_NOT_FOUND();
    }

    return this.mapReview(refreshedReview);
  }

  async createReply(actor: ActorContext, reviewId: string, data: { body: string }) {
    const review = await this.repository.getReviewById(reviewId);

    if (!review) {
      throw Errors.REVIEW_NOT_FOUND();
    }

    if (review.revieweeUserId !== actor.userId) {
      throw Errors.PERMISSION_DENIED();
    }

    const reply = await this.repository.createReply(reviewId, actor.userId, stripHtml(data.body));
    return this.mapReply(reply);
  }

  async updateReply(actor: ActorContext, reviewId: string, replyId: string, data: { body: string }) {
    const reply = await this.repository.getReply(reviewId, replyId);

    if (!reply) {
      throw Errors.REVIEW_REPLY_NOT_FOUND();
    }

    if (reply.authorUserId !== actor.userId) {
      throw Errors.PERMISSION_DENIED();
    }

    return this.mapReply(await this.repository.updateReply(replyId, stripHtml(data.body)));
  }

  async deleteReply(actor: ActorContext, reviewId: string, replyId: string): Promise<void> {
    const reply = await this.repository.getReply(reviewId, replyId);

    if (!reply) {
      throw Errors.REVIEW_REPLY_NOT_FOUND();
    }

    if (reply.authorUserId !== actor.userId) {
      throw Errors.PERMISSION_DENIED();
    }

    await this.repository.deleteReply(replyId);
  }

  async reportReview(actor: ActorContext, reviewId: string, data: { reason: string; severity: ModerationSeverity }) {
    const review = await this.repository.getReviewById(reviewId);

    if (!review) {
      throw Errors.REVIEW_NOT_FOUND();
    }

    const result = await this.moderationService.createReport({
      reporterUserId: actor.userId,
      entityType: "REVIEW",
      entityId: reviewId,
      reason: stripHtml(data.reason),
      severity: data.severity
    });

    return {
      reportId: result.report.id,
      moderationCaseId: result.moderationCase?.id ?? null
    };
  }
}

export { ReviewsService };
