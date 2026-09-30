import { prisma } from "../../lib/prisma";
import type { ArticleStatus, PostReactionType } from "@prisma/client";

export class ArticlesRepository {
  async listArticles(params: { authorUserId?: string; status?: ArticleStatus; page: number; limit: number }) {
    const where: any = {};
    if (params.authorUserId) where.authorUserId = params.authorUserId;
    if (params.status) where.status = params.status;
    else where.status = "PUBLISHED";

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { publishedAt: "desc" },
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
          },
          _count: {
            select: { reactions: true, comments: true }
          }
        }
      }),
      prisma.article.count({ where })
    ]);

    return { articles, total };
  }

  async findByIdOrSlug(idOrSlug: string) {
    return prisma.article.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }]
      },
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
        },
        reactions: true,
        _count: {
          select: { reactions: true, comments: true }
        }
      }
    });
  }

  async create(data: {
    authorUserId: string;
    title: string;
    slug: string;
    body: string;
    coverImageUrl?: string | null;
    readingTimeMinutes?: number;
    status?: ArticleStatus;
    publishedAt?: Date | null;
  }) {
    return prisma.article.create({ data });
  }

  async update(id: string, authorUserId: string, data: any) {
    return prisma.article.updateMany({
      where: { id, authorUserId },
      data
    });
  }

  async delete(id: string, authorUserId: string) {
    return prisma.article.deleteMany({
      where: { id, authorUserId }
    });
  }

  async incrementViews(id: string) {
    return prisma.article.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });
  }

  async upsertReaction(articleId: string, userId: string, reactionType: PostReactionType) {
    return prisma.articleReaction.upsert({
      where: { articleId_userId: { articleId, userId } },
      create: { articleId, userId, reactionType },
      update: { reactionType }
    });
  }

  async removeReaction(articleId: string, userId: string) {
    return prisma.articleReaction.deleteMany({
      where: { articleId, userId }
    });
  }

  async createComment(articleId: string, authorUserId: string, body: string, parentCommentId?: string | null) {
    return prisma.articleComment.create({
      data: { articleId, authorUserId, body, parentCommentId },
      include: {
        authorUser: {
          select: {
            id: true,
            profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
          }
        }
      }
    });
  }

  async listComments(articleId: string) {
    return prisma.articleComment.findMany({
      where: { articleId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: {
        authorUser: {
          select: {
            id: true,
            profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
          }
        },
        replies: {
          where: { isDeleted: false },
          include: {
            authorUser: {
              select: {
                id: true,
                profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
              }
            }
          }
        }
      }
    });
  }
}
