import { prisma } from "../../lib/prisma";

export class HashtagsRepository {
  async getTrending(limit = 10) {
    return prisma.hashtag.findMany({
      orderBy: { postCount: "desc" },
      take: limit
    });
  }

  async findByTag(tag: string) {
    const cleanTag = tag.replace(/^#/, "").toLowerCase();
    return prisma.hashtag.findUnique({
      where: { tag: cleanTag }
    });
  }

  async getHashtagFeed(tag: string, page = 1, limit = 20) {
    const cleanTag = tag.replace(/^#/, "").toLowerCase();
    const hashtag = await prisma.hashtag.findUnique({ where: { tag: cleanTag } });
    if (!hashtag) {
      return { posts: [], total: 0 };
    }

    const [postHashtags, total] = await Promise.all([
      prisma.postHashtag.findMany({
        where: { hashtagId: hashtag.id, post: { isDeleted: false } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            include: {
              authorUser: {
                select: {
                  id: true,
                  profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } },
                  workerProfile: { select: { id: true, isFeatured: true } }
                }
              },
              media: true,
              _count: { select: { likes: true, comments: true } }
            }
          }
        }
      }),
      prisma.postHashtag.count({
        where: { hashtagId: hashtag.id, post: { isDeleted: false } }
      })
    ]);

    return { posts: postHashtags.map((ph) => ph.post), total };
  }

  async follow(hashtagId: string, userId: string) {
    return prisma.hashtagFollow.create({
      data: { hashtagId, userId }
    });
  }

  async unfollow(hashtagId: string, userId: string) {
    return prisma.hashtagFollow.deleteMany({
      where: { hashtagId, userId }
    });
  }
}
