import { prisma } from "../../lib/prisma";

export class CompanyPagesRepository {
  async listCompanies(params: { industry?: string; query?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.industry) where.industry = { equals: params.industry, mode: "insensitive" };
    if (params.query) where.name = { contains: params.query, mode: "insensitive" };

    const [companies, total] = await Promise.all([
      prisma.companyPage.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { followerCount: "desc" },
        include: {
          _count: { select: { followers: true, employees: true } }
        }
      }),
      prisma.companyPage.count({ where })
    ]);

    return { companies, total };
  }

  async findByIdOrSlug(idOrSlug: string) {
    return prisma.companyPage.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }]
      },
      include: {
        adminUser: {
          select: {
            id: true,
            profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
          }
        },
        employees: {
          where: { isCurrent: true },
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
              }
            }
          }
        },
        _count: { select: { followers: true, employees: true } }
      }
    });
  }

  async create(data: any) {
    return prisma.companyPage.create({ data });
  }

  async update(id: string, adminUserId: string, data: any) {
    return prisma.companyPage.updateMany({
      where: { id, adminUserId },
      data
    });
  }

  async delete(id: string, adminUserId: string) {
    return prisma.companyPage.deleteMany({
      where: { id, adminUserId }
    });
  }

  async follow(companyId: string, userId: string) {
    const res = await prisma.companyFollower.create({
      data: { companyId, userId }
    });

    await prisma.companyPage.update({
      where: { id: companyId },
      data: { followerCount: { increment: 1 } }
    });

    return res;
  }

  async unfollow(companyId: string, userId: string) {
    const deleted = await prisma.companyFollower.deleteMany({
      where: { companyId, userId }
    });

    if (deleted.count > 0) {
      await prisma.companyPage.update({
        where: { id: companyId },
        data: { followerCount: { decrement: 1 } }
      });
    }

    return deleted;
  }

  async isFollowing(companyId: string, userId: string) {
    const f = await prisma.companyFollower.findUnique({
      where: { companyId_userId: { companyId, userId } }
    });
    return !!f;
  }
}
