import { prisma } from "../../lib/prisma";

class NetworkRepository {
  async getFollowingUserIds(userId: string): Promise<string[]> {
    const follows = await prisma.userFollow.findMany({
      where: {
        followerUserId: userId,
        targetType: "USER"
      },
      select: { targetId: true }
    });
    return follows.map((f) => f.targetId);
  }

  async getFollowersOfUserIds(userId: string): Promise<string[]> {
    const follows = await prisma.userFollow.findMany({
      where: {
        targetType: "USER",
        targetId: userId
      },
      select: { followerUserId: true }
    });
    return follows.map((f) => f.followerUserId);
  }

  async isFollowing(followerUserId: string, targetUserId: string): Promise<boolean> {
    const follow = await prisma.userFollow.findUnique({
      where: {
        followerUserId_targetType_targetId: {
          followerUserId,
          targetType: "USER",
          targetId: targetUserId
        }
      }
    });
    return Boolean(follow);
  }

  async follow(followerUserId: string, targetUserId: string): Promise<void> {
    await prisma.userFollow.upsert({
      where: {
        followerUserId_targetType_targetId: {
          followerUserId,
          targetType: "USER",
          targetId: targetUserId
        }
      },
      create: {
        followerUserId,
        targetType: "USER",
        targetId: targetUserId
      },
      update: {}
    });
  }

  async unfollow(followerUserId: string, targetUserId: string): Promise<void> {
    await prisma.userFollow.deleteMany({
      where: {
        followerUserId,
        targetType: "USER",
        targetId: targetUserId
      }
    });
  }

  async getMutualConnectionsCount(userIdA: string, userIdB: string): Promise<number> {
    const [followingA, followingB] = await Promise.all([
      this.getFollowingUserIds(userIdA),
      this.getFollowingUserIds(userIdB)
    ]);
    const setB = new Set(followingB);
    return followingA.filter((id) => setB.has(id)).length;
  }

  async findCandidateWorkers(excludeUserIds: string[], limit = 20) {
    return prisma.workerProfile.findMany({
      where: {
        userId: { notIn: excludeUserIds }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: true
          }
        },
        tradeCategories: {
          include: {
            tradeCategory: true
          }
        },
        verificationRequests: {
          where: { status: "APPROVED" },
          take: 1
        }
      },
      take: limit
    });
  }
}

export { NetworkRepository };
