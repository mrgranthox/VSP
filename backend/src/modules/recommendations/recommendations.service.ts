import type { RecommendationStatus } from "@prisma/client";
import { ApiError } from "../../lib/errors";
import type { ActorContext } from "../../types/actor";
import { RecommendationsRepository } from "./recommendations.repository";

export class RecommendationsService {
  constructor(private readonly repository: RecommendationsRepository = new RecommendationsRepository()) {}

  async getRecommendationsForUser(userId: string, isOwner = false) {
    return this.repository.getRecommendationsForUser(userId, isOwner);
  }

  async getRecommendationsGiven(actor: ActorContext) {
    return this.repository.getRecommendationsGivenByUser(actor.userId);
  }

  async createRecommendation(actor: ActorContext, data: { recipientUserId: string; relationship: string; text: string }) {
    if (actor.userId === data.recipientUserId) {
      throw new ApiError("BAD_REQUEST", 400, "You cannot write a recommendation for yourself");
    }

    return this.repository.create({
      authorUserId: actor.userId,
      recipientUserId: data.recipientUserId,
      relationship: data.relationship,
      text: data.text
    });
  }

  async updateStatus(actor: ActorContext, id: string, status: RecommendationStatus) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", 404, "Recommendation not found");
    }

    // Only recipient can accept/decline/hide; author can delete
    if (existing.recipientUserId !== actor.userId && existing.authorUserId !== actor.userId) {
      throw new ApiError("FORBIDDEN", 403, "You do not have permission to update this recommendation");
    }

    return this.repository.updateStatus(id, status);
  }

  async delete(actor: ActorContext, id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", 404, "Recommendation not found");
    }

    if (existing.authorUserId !== actor.userId && existing.recipientUserId !== actor.userId) {
      throw new ApiError("FORBIDDEN", 403, "You do not have permission to delete this recommendation");
    }

    return this.repository.delete(id);
  }
}
