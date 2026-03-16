import { Prisma, UserStatus, VerificationStatus, type FollowTargetType } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type UserWithProfile = Prisma.UserGetPayload<{
  include: {
    profile: true;
  };
}>;

type PublicUserProfile = {
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  cityId: string | null;
};

class UsersRepository {
  async getUserWithProfile(userId: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    });
  }

  async updateUserProfile(
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      displayName: string | null;
      bio: string | null;
      cityId: string | null;
      lat: Prisma.Decimal | null;
      lng: Prisma.Decimal | null;
    }>
  ) {
    return prisma.userProfile.update({
      where: { userId },
      data
    });
  }

  async getPublicProfile(userId: string): Promise<PublicUserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            cityId: true
          }
        }
      }
    });

    if (!user?.profile) {
      return null;
    }

    return {
      userId: user.id,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      displayName: user.profile.displayName,
      avatarUrl: user.profile.avatarUrl,
      bio: user.profile.bio,
      cityId: user.profile.cityId
    };
  }

  async markUserDeleted(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.DELETED
        }
      });

      await tx.userSession.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    });
  }

  async ensureNotificationPreference(userId: string) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {}
    });
  }

  async updateNotificationPreference(
    userId: string,
    data: Partial<{
      chatPushEnabled: boolean;
      requestPushEnabled: boolean;
      marketingEmailEnabled: boolean;
      quietHoursStart: number | null;
      quietHoursEnd: number | null;
    }>
  ) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...data
      },
      update: data
    });
  }

  async getSavedWorkers(userId: string, skip: number, take: number) {
    return prisma.customerSavedWorker.findMany({
      where: { userId },
      include: {
        workerProfile: true
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take
    });
  }

  async countSavedWorkers(userId: string): Promise<number> {
    return prisma.customerSavedWorker.count({
      where: { userId }
    });
  }

  async saveWorker(userId: string, workerProfileId: string): Promise<void> {
    await prisma.customerSavedWorker.upsert({
      where: {
        userId_workerProfileId: {
          userId,
          workerProfileId
        }
      },
      create: {
        userId,
        workerProfileId
      },
      update: {}
    });
  }

  async unsaveWorker(userId: string, workerProfileId: string): Promise<void> {
    await prisma.customerSavedWorker.deleteMany({
      where: {
        userId,
        workerProfileId
      }
    });
  }

  async getApprovedWorkerProfile(workerProfileId: string) {
    return prisma.workerProfile.findFirst({
      where: {
        id: workerProfileId,
        verificationStatus: VerificationStatus.APPROVED
      }
    });
  }

  async getWorkerProfile(workerProfileId: string) {
    return prisma.workerProfile.findUnique({
      where: { id: workerProfileId }
    });
  }

  async getFollows(userId: string, skip: number, take: number) {
    return prisma.userFollow.findMany({
      where: { followerUserId: userId },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take
    });
  }

  async countFollows(userId: string): Promise<number> {
    return prisma.userFollow.count({
      where: { followerUserId: userId }
    });
  }

  async followTarget(userId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
    await prisma.userFollow.upsert({
      where: {
        followerUserId_targetType_targetId: {
          followerUserId: userId,
          targetType,
          targetId
        }
      },
      create: {
        followerUserId: userId,
        targetType,
        targetId
      },
      update: {}
    });
  }

  async unfollowTarget(userId: string, targetType: FollowTargetType, targetId: string): Promise<void> {
    await prisma.userFollow.deleteMany({
      where: {
        followerUserId: userId,
        targetType,
        targetId
      }
    });
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    return Boolean(user);
  }

  async cityExists(cityId: string): Promise<boolean> {
    const city = await prisma.cityConfig.findUnique({
      where: { id: cityId },
      select: { id: true, isEnabled: true }
    });

    return Boolean(city?.isEnabled);
  }
}

export { UsersRepository };
export type { PublicUserProfile, UserWithProfile };
