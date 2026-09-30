import { prisma } from "../../lib/prisma";

export class ProfileSectionsRepository {
  async getUserSections(userId: string) {
    const [experiences, educations, accomplishments, volunteers, featuredItems, user] = await Promise.all([
      prisma.profileExperience.findMany({ where: { userId }, orderBy: { startDate: "desc" } }),
      prisma.profileEducation.findMany({ where: { userId }, orderBy: { startDate: "desc" } }),
      prisma.profileAccomplishment.findMany({ where: { userId }, orderBy: { issueDate: "desc" } }),
      prisma.profileVolunteer.findMany({ where: { userId }, orderBy: { startDate: "desc" } }),
      prisma.profileFeaturedItem.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { openToWork: true, openToWorkTitle: true, openToHire: true }
      })
    ]);

    return {
      experiences,
      educations,
      accomplishments,
      volunteers,
      featuredItems,
      openToWork: user?.openToWork ?? false,
      openToWorkTitle: user?.openToWorkTitle ?? null,
      openToHire: user?.openToHire ?? false
    };
  }

  // Experiences
  createExperience(userId: string, data: any) {
    return prisma.profileExperience.create({ data: { ...data, userId } });
  }

  updateExperience(id: string, userId: string, data: any) {
    return prisma.profileExperience.updateMany({ where: { id, userId }, data });
  }

  deleteExperience(id: string, userId: string) {
    return prisma.profileExperience.deleteMany({ where: { id, userId } });
  }

  // Educations
  createEducation(userId: string, data: any) {
    return prisma.profileEducation.create({ data: { ...data, userId } });
  }

  updateEducation(id: string, userId: string, data: any) {
    return prisma.profileEducation.updateMany({ where: { id, userId }, data });
  }

  deleteEducation(id: string, userId: string) {
    return prisma.profileEducation.deleteMany({ where: { id, userId } });
  }

  // Accomplishments
  createAccomplishment(userId: string, data: any) {
    return prisma.profileAccomplishment.create({ data: { ...data, userId } });
  }

  updateAccomplishment(id: string, userId: string, data: any) {
    return prisma.profileAccomplishment.updateMany({ where: { id, userId }, data });
  }

  deleteAccomplishment(id: string, userId: string) {
    return prisma.profileAccomplishment.deleteMany({ where: { id, userId } });
  }

  // Volunteers
  createVolunteer(userId: string, data: any) {
    return prisma.profileVolunteer.create({ data: { ...data, userId } });
  }

  updateVolunteer(id: string, userId: string, data: any) {
    return prisma.profileVolunteer.updateMany({ where: { id, userId }, data });
  }

  deleteVolunteer(id: string, userId: string) {
    return prisma.profileVolunteer.deleteMany({ where: { id, userId } });
  }

  // Featured
  createFeaturedItem(userId: string, data: any) {
    return prisma.profileFeaturedItem.create({ data: { ...data, userId } });
  }

  updateFeaturedItem(id: string, userId: string, data: any) {
    return prisma.profileFeaturedItem.updateMany({ where: { id, userId }, data });
  }

  deleteFeaturedItem(id: string, userId: string) {
    return prisma.profileFeaturedItem.deleteMany({ where: { id, userId } });
  }

  // Open To Work
  updateOpenToWork(userId: string, data: { openToWork: boolean; openToWorkTitle?: string | null; openToHire?: boolean }) {
    return prisma.user.update({ where: { id: userId }, data });
  }

  // Profile Views
  async recordProfileView(viewedUserId: string, viewerUserId?: string) {
    if (viewerUserId && viewerUserId === viewedUserId) {
      return null;
    }

    // Dedupe within last 24h for same viewer
    if (viewerUserId) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await prisma.profileView.findFirst({
        where: { viewedUserId, viewerUserId, viewedAt: { gte: oneDayAgo } }
      });
      if (existing) {
        return existing;
      }
    }

    return prisma.profileView.create({
      data: { viewedUserId, viewerUserId }
    });
  }

  async getProfileViews(userId: string) {
    const [totalViews, recentViews] = await Promise.all([
      prisma.profileView.count({ where: { viewedUserId: userId } }),
      prisma.profileView.findMany({
        where: { viewedUserId: userId },
        orderBy: { viewedAt: "desc" },
        take: 20,
        include: {
          viewerUser: {
            select: {
              id: true,
              profile: {
                select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true }
              }
            }
          }
        }
      })
    ]);

    return { totalViews, recentViews };
  }
}
