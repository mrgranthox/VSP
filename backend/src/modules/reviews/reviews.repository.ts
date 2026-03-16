import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const userSummarySelect = {
  id: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true
    }
  }
} as const;

const reviewInclude = {
  booking: {
    select: {
      id: true,
      status: true,
      completedAt: true,
      customerUserId: true,
      workerProfileId: true,
      workerProfile: {
        select: {
          id: true,
          userId: true
        }
      }
    }
  },
  reviewerUser: {
    select: userSummarySelect
  },
  revieweeUser: {
    select: userSummarySelect
  },
  dimensionScores: {
    orderBy: {
      dimensionKey: "asc"
    }
  },
  replies: {
    include: {
      authorUser: {
        select: userSummarySelect
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  }
} as const;

type ReviewRecord = Prisma.ReviewGetPayload<{
  include: typeof reviewInclude;
}>;

class ReviewsRepository {
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

  async getBookingReviewContext(bookingId: string) {
    return prisma.booking.findUnique({
      where: {
        id: bookingId
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
        customerUserId: true,
        workerProfileId: true,
        workerProfile: {
          select: {
            id: true,
            userId: true
          }
        },
        review: {
          select: {
            id: true
          }
        }
      }
    });
  }

  async getReviewById(reviewId: string): Promise<ReviewRecord | null> {
    return prisma.review.findUnique({
      where: {
        id: reviewId
      },
      include: reviewInclude
    });
  }

  async createReview(data: {
    bookingId: string;
    reviewerUserId: string;
    revieweeUserId: string;
    rating: number;
    body?: string | null;
    dimensions?: Array<{ dimensionKey: string; score: number }>;
  }): Promise<ReviewRecord> {
    return prisma.review.create({
      data: {
        bookingId: data.bookingId,
        reviewerUserId: data.reviewerUserId,
        revieweeUserId: data.revieweeUserId,
        rating: data.rating,
        body: data.body ?? null,
        dimensionScores: data.dimensions?.length
          ? {
              create: data.dimensions.map((dimension) => ({
                dimensionKey: dimension.dimensionKey,
                score: dimension.score
              }))
            }
          : undefined
      },
      include: reviewInclude
    });
  }

  async upsertDimensionScores(reviewId: string, dimensions: Array<{ dimensionKey: string; score: number }>): Promise<void> {
    await prisma.$transaction(
      dimensions.map((dimension) =>
        prisma.reviewDimensionScore.upsert({
          where: {
            reviewId_dimensionKey: {
              reviewId,
              dimensionKey: dimension.dimensionKey
            }
          },
          update: {
            score: dimension.score
          },
          create: {
            reviewId,
            dimensionKey: dimension.dimensionKey,
            score: dimension.score
          }
        })
      )
    );
  }

  async createReply(reviewId: string, authorUserId: string, body: string) {
    return prisma.reviewReply.create({
      data: {
        reviewId,
        authorUserId,
        body
      },
      include: {
        authorUser: {
          select: userSummarySelect
        }
      }
    });
  }

  async getReply(reviewId: string, replyId: string) {
    return prisma.reviewReply.findFirst({
      where: {
        id: replyId,
        reviewId
      },
      include: {
        authorUser: {
          select: userSummarySelect
        }
      }
    });
  }

  async updateReply(replyId: string, body: string) {
    return prisma.reviewReply.update({
      where: {
        id: replyId
      },
      data: {
        body
      },
      include: {
        authorUser: {
          select: userSummarySelect
        }
      }
    });
  }

  async deleteReply(replyId: string): Promise<void> {
    await prisma.reviewReply.delete({
      where: {
        id: replyId
      }
    });
  }

  async getWorkerProfile(workerProfileId: string) {
    return prisma.workerProfile.findUnique({
      where: {
        id: workerProfileId
      },
      select: {
        id: true,
        userId: true
      }
    });
  }

  async listWorkerReviews(
    revieweeUserId: string,
    filters: { minRating?: number },
    skip: number,
    take: number
  ): Promise<ReviewRecord[]> {
    return prisma.review.findMany({
      where: {
        revieweeUserId,
        ...(filters.minRating !== undefined
          ? {
              rating: {
                gte: filters.minRating
              }
            }
          : {})
      },
      include: reviewInclude,
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take
    });
  }

  async countWorkerReviews(revieweeUserId: string, filters: { minRating?: number }): Promise<number> {
    return prisma.review.count({
      where: {
        revieweeUserId,
        ...(filters.minRating !== undefined
          ? {
              rating: {
                gte: filters.minRating
              }
            }
          : {})
      }
    });
  }
}

export { ReviewsRepository };
export type { ReviewRecord };
