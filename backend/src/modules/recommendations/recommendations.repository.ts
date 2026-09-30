import { prisma } from "../../lib/prisma";
import type { RecommendationStatus } from "@prisma/client";

export class RecommendationsRepository {
  async getRecommendationsForUser(userId: string, includePending = false) {
    const where: any = { recipientUserId: userId };
    if (!includePending) {
      where.status = "ACCEPTED";
    }

    return prisma.recommendation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        authorUser: {
          select: {
            id: true,
            profile: {
              select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true }
            },
            workerProfile: {
              select: { id: true, isFeatured: true }
            }
          }
        }
      }
    });
  }

  async getRecommendationsGivenByUser(userId: string) {
    return prisma.recommendation.findMany({
      where: { authorUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        recipientUser: {
          select: {
            id: true,
            profile: {
              select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true }
            }
          }
        }
      }
    });
  }

  async findById(id: string) {
    return prisma.recommendation.findUnique({
      where: { id }
    });
  }

  async create(data: { authorUserId: string; recipientUserId: string; relationship: string; text: string }) {
    return prisma.recommendation.create({
      data: {
        ...data,
        status: "PENDING"
      }
    });
  }

  async updateStatus(id: string, status: RecommendationStatus) {
    return prisma.recommendation.update({
      where: { id },
      data: { status }
    });
  }

  async delete(id: string) {
    return prisma.recommendation.delete({
      where: { id }
    });
  }
}
