import { type PostReactionType, UserStatus, type VisibilityScope } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const postAuthorSelect = {
  id: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
      cityId: true
    }
  },
  workerProfile: {
    select: {
      id: true
    }
  }
} as const;

const buildPostInclude = (viewerUserId?: string) =>
  ({
    authorUser: {
      select: postAuthorSelect
    },
    media: {
      orderBy: {
        sortOrder: "asc"
      }
    },
    poll: {
      include: {
        options: true,
        votes: viewerUserId
          ? {
              where: {
                userId: viewerUserId
              }
            }
          : false
      }
    },
    _count: {
      select: {
        likes: true,
        saves: true,
        reposts: true,
        comments: {
          where: {
            isDeleted: false
          }
        }
      }
    },
    ...(viewerUserId
      ? {
          likes: {
            where: {
              userId: viewerUserId
            },
            select: {
              id: true,
              reactionType: true
            },
            take: 1
          },
          saves: {
            where: {
              userId: viewerUserId
            },
            select: {
              id: true
            },
            take: 1
          }
        }
      : {})
  }) as const;

const buildCommentInclude = (viewerUserId?: string) =>
  ({
    authorUser: {
      select: {
        id: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    },
    _count: {
      select: {
        likes: true,
        replies: {
          where: {
            isDeleted: false
          }
        }
      }
    },
    ...(viewerUserId
      ? {
          likes: {
            where: {
              userId: viewerUserId
            },
            select: {
              id: true
            },
            take: 1
          }
        }
      : {})
  }) as const;

class SocialRepository {
  async getUserProfileCityId(userId: string): Promise<string | null> {
    const profile = await prisma.userProfile.findUnique({
      where: {
        userId
      },
      select: {
        cityId: true
      }
    });

    return profile?.cityId ?? null;
  }

  async listUserFollows(userId: string) {
    return prisma.userFollow.findMany({
      where: {
        followerUserId: userId
      },
      select: {
        targetType: true,
        targetId: true
      }
    });
  }

  async listFollowedUserAuthors(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }

    return prisma.userFollow.findMany({
      where: {
        followerUserId: {
          in: userIds
        },
        targetType: "USER"
      },
      select: {
        targetId: true
      }
    });
  }

  async getFeedRankingWeights() {
    return prisma.systemConfig.findUnique({
      where: {
        configKey: "feed_ranking_weights"
      },
      select: {
        valueJson: true
      }
    });
  }

  async createPost(data: {
    authorUserId: string;
    body: string;
    visibility: VisibilityScope;
    media: Array<{ id?: string; mediaAssetId?: string; mediaUrl: string; mediaType: string; sortOrder: number }>;
  }) {
    return prisma.post.create({
      data: {
        authorUserId: data.authorUserId,
        body: data.body,
        visibility: data.visibility,
        media: data.media.length
          ? {
              create: data.media.map((item) => ({
                ...(item.id ? { id: item.id } : {}),
                ...(item.mediaAssetId ? { mediaAssetId: item.mediaAssetId } : {}),
                mediaUrl: item.mediaUrl,
                mediaType: item.mediaType,
                sortOrder: item.sortOrder
              }))
            }
          : undefined
      },
      include: buildPostInclude(data.authorUserId)
    });
  }

  async getPostById(postId: string, viewerUserId?: string) {
    return prisma.post.findFirst({
      where: {
        id: postId,
        isDeleted: false,
        authorUser: {
          status: UserStatus.ACTIVE
        }
      },
      include: buildPostInclude(viewerUserId)
    });
  }

  async listFeedCandidates(params: { since?: Date; viewerUserId?: string }) {
    return prisma.post.findMany({
      where: {
        isDeleted: false,
        authorUser: {
          status: UserStatus.ACTIVE
        },
        ...(params.since
          ? {
              createdAt: {
                gte: params.since
              }
            }
          : {})
      },
      include: buildPostInclude(params.viewerUserId),
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async updatePost(postId: string, data: Partial<{ body: string; visibility: VisibilityScope }>) {
    return prisma.post.update({
      where: {
        id: postId
      },
      data,
      include: buildPostInclude()
    });
  }

  async softDeletePost(postId: string): Promise<void> {
    await prisma.post.update({
      where: {
        id: postId
      },
      data: {
        isDeleted: true
      }
    });
  }

  async addPostMedia(postId: string, mediaId: string, mediaUrl: string, mediaType: string, mediaAssetId?: string) {
    const currentMediaCount = await prisma.postMedia.count({
      where: {
        postId
      }
    });

    return prisma.postMedia.upsert({
      where: {
        id: mediaId
      },
      update: {
        postId,
        mediaAssetId: mediaAssetId ?? null,
        mediaUrl,
        mediaType,
        sortOrder: currentMediaCount
      },
      create: {
        id: mediaId,
        postId,
        mediaAssetId,
        mediaUrl,
        mediaType,
        sortOrder: currentMediaCount
      }
    });
  }

  async removePostMedia(postId: string, mediaId: string): Promise<void> {
    await prisma.postMedia.deleteMany({
      where: {
        id: mediaId,
        postId
      }
    });
  }

  async likePost(postId: string, userId: string): Promise<void> {
    await prisma.postLike.upsert({
      where: {
        postId_userId: {
          postId,
          userId
        }
      },
      create: {
        postId,
        userId,
        reactionType: "LIKE"
      },
      update: {
        reactionType: "LIKE"
      }
    });
  }

  async reactToPost(postId: string, userId: string, reactionType: PostReactionType = "LIKE"): Promise<void> {
    await prisma.postLike.upsert({
      where: {
        postId_userId: {
          postId,
          userId
        }
      },
      create: {
        postId,
        userId,
        reactionType
      },
      update: {
        reactionType
      }
    });
  }

  async removePostReaction(postId: string, userId: string): Promise<void> {
    await prisma.postLike.deleteMany({
      where: {
        postId,
        userId
      }
    });
  }

  async createRepost(postId: string, userId: string, comment?: string) {
    return prisma.postRepost.create({
      data: {
        postId,
        authorUserId: userId,
        comment: comment || null
      }
    });
  }

  async votePoll(pollId: string, optionId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const existingVote = await tx.pollVote.findUnique({
        where: {
          pollId_userId: {
            pollId,
            userId
          }
        }
      });

      if (existingVote) {
        if (existingVote.pollOptionId !== optionId) {
          await tx.pollOption.update({
            where: { id: existingVote.pollOptionId },
            data: { voteCount: { decrement: 1 } }
          });
          await tx.pollVote.update({
            where: { id: existingVote.id },
            data: { pollOptionId: optionId }
          });
          await tx.pollOption.update({
            where: { id: optionId },
            data: { voteCount: { increment: 1 } }
          });
        }
      } else {
        await tx.pollVote.create({
          data: {
            pollId,
            pollOptionId: optionId,
            userId
          }
        });
        await tx.pollOption.update({
          where: { id: optionId },
          data: { voteCount: { increment: 1 } }
        });
      }

      const options = await tx.pollOption.findMany({
        where: { pollId }
      });

      const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);

      return {
        pollId,
        selectedOptionId: optionId,
        totalVotes,
        options: options.map((o) => ({
          id: o.id,
          label: o.label,
          voteCount: o.voteCount,
          percentage: totalVotes > 0 ? Math.round((o.voteCount / totalVotes) * 100) : 0
        }))
      };
    });
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    await prisma.postLike.deleteMany({
      where: {
        postId,
        userId
      }
    });
  }

  async savePost(postId: string, userId: string): Promise<void> {
    await prisma.postSave.upsert({
      where: {
        postId_userId: {
          postId,
          userId
        }
      },
      create: {
        postId,
        userId
      },
      update: {}
    });
  }

  async unsavePost(postId: string, userId: string): Promise<void> {
    await prisma.postSave.deleteMany({
      where: {
        postId,
        userId
      }
    });
  }

  async createComment(data: { postId: string; parentCommentId?: string; authorUserId: string; body: string }) {
    return prisma.comment.create({
      data: {
        postId: data.postId,
        parentCommentId: data.parentCommentId,
        authorUserId: data.authorUserId,
        body: data.body
      },
      include: buildCommentInclude(data.authorUserId)
    });
  }

  async getCommentById(commentId: string, viewerUserId?: string) {
    return prisma.comment.findFirst({
      where: {
        id: commentId,
        isDeleted: false
      },
      include: {
        ...buildCommentInclude(viewerUserId),
        post: {
          include: buildPostInclude(viewerUserId)
        },
        parentComment: {
          select: {
            id: true,
            parentCommentId: true,
            postId: true,
            isDeleted: true
          }
        }
      }
    });
  }

  async listTopLevelComments(postId: string, skip: number, take: number, viewerUserId?: string) {
    return prisma.comment.findMany({
      where: {
        postId,
        parentCommentId: null,
        isDeleted: false
      },
      include: {
        ...buildCommentInclude(viewerUserId),
        replies: {
          where: {
            isDeleted: false
          },
          include: buildCommentInclude(viewerUserId),
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      skip,
      take
    });
  }

  async countTopLevelComments(postId: string): Promise<number> {
    return prisma.comment.count({
      where: {
        postId,
        parentCommentId: null,
        isDeleted: false
      }
    });
  }

  async updateComment(commentId: string, body: string) {
    return prisma.comment.update({
      where: {
        id: commentId
      },
      data: {
        body
      },
      include: buildCommentInclude()
    });
  }

  async softDeleteComment(commentId: string): Promise<void> {
    await prisma.comment.update({
      where: {
        id: commentId
      },
      data: {
        isDeleted: true
      }
    });
  }

  async likeComment(commentId: string, userId: string): Promise<void> {
    await prisma.commentLike.upsert({
      where: {
        commentId_userId: {
          commentId,
          userId
        }
      },
      create: {
        commentId,
        userId
      },
      update: {}
    });
  }

  async unlikeComment(commentId: string, userId: string): Promise<void> {
    await prisma.commentLike.deleteMany({
      where: {
        commentId,
        userId
      }
    });
  }

  async reportComment(data: {
    commentId: string;
    reporterUserId: string;
    reason: string;
  }): Promise<void> {
    await prisma.commentReport.create({
      data: {
        commentId: data.commentId,
        reporterUserId: data.reporterUserId,
        reason: data.reason
      }
    });
  }
}

export { SocialRepository };
