import { prisma } from "../../lib/prisma";

export class JobAlertsRepository {
  async listUserAlerts(userId: string) {
    return prisma.jobAlert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(data: { userId: string; queryText: string; location?: string | null; tradeCategoryId?: string | null; frequency: string }) {
    return prisma.jobAlert.create({ data });
  }

  async update(id: string, userId: string, data: any) {
    return prisma.jobAlert.updateMany({
      where: { id, userId },
      data
    });
  }

  async delete(id: string, userId: string) {
    return prisma.jobAlert.deleteMany({
      where: { id, userId }
    });
  }
}
