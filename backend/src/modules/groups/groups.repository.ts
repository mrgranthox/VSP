import { prisma } from "../../lib/prisma";

export class GroupsRepository {
  async listGroups(params: { query?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.query) where.name = { contains: params.query, mode: "insensitive" };

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { memberCount: "desc" },
        include: {
          creatorUser: {
            select: {
              id: true,
              profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
            }
          },
          _count: {
            select: { members: true, posts: true }
          }
        }
      }),
      prisma.group.count({ where })
    ]);

    return { groups, total };
  }

  async findById(id: string) {
    return prisma.group.findUnique({
      where: { id },
      include: {
        creatorUser: {
          select: {
            id: true,
            profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
          }
        },
        members: {
          take: 30,
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
              }
            }
          }
        },
        _count: {
          select: { members: true, posts: true }
        }
      }
    });
  }

  async create(data: { creatorUserId: string; name: string; description: string; coverImageUrl?: string | null; privacy: any }) {
    return prisma.group.create({
      data: {
        ...data,
        members: {
          create: {
            userId: data.creatorUserId,
            role: "ADMIN"
          }
        }
      }
    });
  }

  async update(id: string, creatorUserId: string, data: any) {
    return prisma.group.updateMany({
      where: { id, creatorUserId },
      data
    });
  }

  async delete(id: string, creatorUserId: string) {
    return prisma.group.deleteMany({
      where: { id, creatorUserId }
    });
  }

  async joinGroup(groupId: string, userId: string) {
    const member = await prisma.groupMember.create({
      data: { groupId, userId, role: "MEMBER" }
    });

    await prisma.group.update({
      where: { id: groupId },
      data: { memberCount: { increment: 1 } }
    });

    return member;
  }

  async leaveGroup(groupId: string, userId: string) {
    const deleted = await prisma.groupMember.deleteMany({
      where: { groupId, userId }
    });

    if (deleted.count > 0) {
      await prisma.group.update({
        where: { id: groupId },
        data: { memberCount: { decrement: 1 } }
      });
    }

    return deleted;
  }

  async getGroupPosts(groupId: string, page: number, limit: number) {
    return prisma.groupPost.findMany({
      where: { groupId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: {
            authorUser: {
              select: {
                id: true,
                profile: { select: { displayName: true, firstName: true, lastName: true, avatarUrl: true, bio: true } }
              }
            },
            media: true,
            _count: { select: { likes: true, comments: true } }
          }
        }
      }
    });
  }
}
