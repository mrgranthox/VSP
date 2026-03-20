import { Prisma, SupportTicketStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { publicUserSelect } from "../../lib/public-user-select";

class SupportRepository {
  async getSystemConfig(configKey: string) {
    return prisma.systemConfig.findUnique({
      where: { configKey }
    });
  }

  async createTicket(data: {
    openedByUserId: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    subject: string;
    body: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }) {
    return prisma.supportTicket.create({
      data: {
        openedByUserId: data.openedByUserId,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
        subject: data.subject,
        body: data.body,
        priority: data.priority,
        messages: {
          create: {
            authorUserId: data.openedByUserId,
            body: data.body
          }
        }
      },
      include: {
        messages: true
      }
    });
  }

  async countTicketsForUser(userId: string) {
    return prisma.supportTicket.count({
      where: {
        openedByUserId: userId
      }
    });
  }

  async listTicketsForUser(userId: string, skip: number, take: number) {
    return prisma.supportTicket.findMany({
      where: {
        openedByUserId: userId
      },
      orderBy: {
        updatedAt: "desc"
      },
      skip,
      take
    });
  }

  async getTicketById(ticketId: string) {
    return prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        openedByUser: {
          select: publicUserSelect
        },
        assignedSupportUser: {
          select: publicUserSelect
        },
        messages: {
          include: {
            authorUser: {
              select: publicUserSelect
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
  }

  async addMessage(ticketId: string, authorUserId: string, body: string, isInternalNote: boolean) {
    return prisma.supportTicketMessage.create({
      data: {
        supportTicketId: ticketId,
        authorUserId,
        body,
        isInternalNote
      }
    });
  }

  async updateTicket(
    ticketId: string,
    data: Prisma.SupportTicketUncheckedUpdateInput & {
      assignedSupportUserId?: string | null;
    }
  ) {
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data
    });
  }

  async listTicketsAdmin(filters: { status?: SupportTicketStatus; priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" }, skip: number, take: number) {
    return prisma.supportTicket.findMany({
      where: {
        status: filters.status,
        priority: filters.priority
      },
      include: {
        openedByUser: {
          select: publicUserSelect
        },
        assignedSupportUser: {
          select: publicUserSelect
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      skip,
      take
    });
  }

  async countTicketsAdmin(filters: { status?: SupportTicketStatus; priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" }) {
    return prisma.supportTicket.count({
      where: {
        status: filters.status,
        priority: filters.priority
      }
    });
  }

  async autoCloseResolvedTickets(before: Date) {
    return prisma.supportTicket.updateMany({
      where: {
        status: SupportTicketStatus.RESOLVED,
        updatedAt: {
          lt: before
        }
      },
      data: {
        status: SupportTicketStatus.CLOSED
      }
    });
  }
}

export { SupportRepository };
