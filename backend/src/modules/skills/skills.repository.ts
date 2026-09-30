import { prisma } from "../../lib/prisma";

export class SkillsRepository {
  async listSkills(params: { category?: string; query?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.category) {
      where.category = { equals: params.category, mode: "insensitive" };
    }
    if (params.query) {
      where.name = { contains: params.query, mode: "insensitive" };
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { userSkills: true }
          }
        }
      }),
      prisma.skill.count({ where })
    ]);

    return { skills, total };
  }

  async findSkillById(id: string) {
    return prisma.skill.findUnique({ where: { id } });
  }

  async findSkillByName(name: string) {
    return prisma.skill.findUnique({ where: { name } });
  }

  async createSkill(data: { name: string; category: string; slug: string; isVerified?: boolean }) {
    return prisma.skill.create({ data });
  }

  async updateSkill(id: string, data: any) {
    return prisma.skill.update({ where: { id }, data });
  }

  async deleteSkill(id: string) {
    return prisma.skill.delete({ where: { id } });
  }

  async getUserSkills(userId: string) {
    return prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: true,
        endorsements: {
          include: {
            endorserUser: {
              select: {
                id: true,
                profile: {
                  select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });
  }

  async addUserSkill(userId: string, skillId: string) {
    return prisma.userSkill.create({
      data: { userId, skillId },
      include: { skill: true }
    });
  }

  async removeUserSkill(userId: string, skillId: string) {
    return prisma.userSkill.deleteMany({
      where: { userId, skillId }
    });
  }

  async endorseSkill(userSkillId: string, endorserUserId: string) {
    return prisma.skillEndorsement.create({
      data: { userSkillId, endorserUserId }
    });
  }

  async removeEndorsement(userSkillId: string, endorserUserId: string) {
    return prisma.skillEndorsement.deleteMany({
      where: { userSkillId, endorserUserId }
    });
  }

  async findUserSkill(userId: string, skillId: string) {
    return prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } }
    });
  }
}
