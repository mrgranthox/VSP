import { AssignmentStatus, Prisma, RequestStatus, VerificationStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const profileSummarySelect = {
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  cityId: true
} satisfies Prisma.UserProfileSelect;

const requestInclude = {
  customerUser: {
    select: {
      id: true,
      profile: {
        select: profileSummarySelect
      }
    }
  },
  tradeCategory: {
    select: {
      id: true,
      slug: true,
      name: true,
      iconUrl: true
    }
  },
  preferredWorkerProfile: {
    select: {
      id: true,
      userId: true,
      headline: true,
      verificationStatus: true,
      user: {
        select: {
          profile: {
            select: profileSummarySelect
          }
        }
      }
    }
  },
  items: {
    orderBy: {
      id: "asc"
    }
  },
  assignments: {
    orderBy: {
      assignedAt: "asc"
    },
    include: {
      workerProfile: {
        select: {
          id: true,
          userId: true,
          headline: true,
          verificationStatus: true,
          user: {
            select: {
              profile: {
                select: profileSummarySelect
              }
            }
          }
        }
      }
    }
  },
  booking: {
    select: {
      id: true,
      serviceRequestId: true,
      workerProfileId: true,
      customerUserId: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
      completedAt: true
    }
  }
} satisfies Prisma.ServiceRequestInclude;

const statusHistoryInclude = {
  changedByUser: {
    select: {
      id: true,
      profile: {
        select: profileSummarySelect
      }
    }
  }
} satisfies Prisma.ServiceRequestStatusHistoryInclude;

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;
type ServiceRequestRecord = Prisma.ServiceRequestGetPayload<{ include: typeof requestInclude }>;
type ServiceRequestStatusHistoryRecord = Prisma.ServiceRequestStatusHistoryGetPayload<{ include: typeof statusHistoryInclude }>;

class RequestsRepository {
  private buildAccessibleWhere(actorUserId: string, workerProfileId?: string, status?: RequestStatus): Prisma.ServiceRequestWhereInput {
    const accessConditions: Prisma.ServiceRequestWhereInput[] = [{ customerUserId: actorUserId }];

    if (workerProfileId) {
      accessConditions.push({
        preferredWorkerProfile: {
          is: {
            userId: actorUserId
          }
        }
      });
      accessConditions.push({
        assignments: {
          some: {
            workerProfileId
          }
        }
      });
      accessConditions.push({
        booking: {
          is: {
            workerProfileId
          }
        }
      });
    }

    return {
      OR: accessConditions,
      ...(status ? { status } : {})
    };
  }

  async getWorkerProfileByUserId(userId: string) {
    return prisma.workerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        verificationStatus: true
      }
    });
  }

  async tradeCategoryExists(tradeCategoryId: string): Promise<boolean> {
    const tradeCategory = await prisma.tradeCategory.findUnique({
      where: { id: tradeCategoryId },
      select: { id: true }
    });

    return Boolean(tradeCategory);
  }

  async getApprovedWorkerProfile(workerProfileId: string) {
    return prisma.workerProfile.findUnique({
      where: { id: workerProfileId },
      select: {
        id: true,
        userId: true,
        headline: true,
        verificationStatus: true,
        user: {
          select: {
            profile: {
              select: profileSummarySelect
            }
          }
        }
      }
    });
  }

  async getSystemConfig(configKey: string) {
    return prisma.systemConfig.findUnique({
      where: { configKey },
      select: {
        valueJson: true
      }
    });
  }

  async findIdempotencyKey(idempotencyKey: string) {
    return prisma.apiIdempotencyKey.findUnique({
      where: { idempotencyKey }
    });
  }

  async deleteIdempotencyKey(idempotencyKey: string): Promise<void> {
    await prisma.apiIdempotencyKey.delete({
      where: { idempotencyKey }
    });
  }

  async listRequests(actorUserId: string, workerProfileId: string | undefined, status: RequestStatus | undefined, skip: number, take: number) {
    return prisma.serviceRequest.findMany({
      where: this.buildAccessibleWhere(actorUserId, workerProfileId, status),
      include: requestInclude,
      orderBy: {
        requestedAt: "desc"
      },
      skip,
      take
    });
  }

  async countRequests(actorUserId: string, workerProfileId: string | undefined, status: RequestStatus | undefined) {
    return prisma.serviceRequest.count({
      where: this.buildAccessibleWhere(actorUserId, workerProfileId, status)
    });
  }

  async getRequestById(requestId: string, client: PrismaClientLike = prisma): Promise<ServiceRequestRecord | null> {
    return client.serviceRequest.findUnique({
      where: { id: requestId },
      include: requestInclude
    });
  }

  async createRequest(
    client: PrismaClientLike,
    data: Prisma.ServiceRequestUncheckedCreateInput,
    items: Array<{ label: string; quantity: number; note?: string }>
  ): Promise<ServiceRequestRecord> {
    return client.serviceRequest.create({
      data: {
        ...data,
        items: items.length
          ? {
              create: items.map((item) => ({
                label: item.label,
                quantity: item.quantity,
                note: item.note
              }))
            }
          : undefined
      },
      include: requestInclude
    });
  }

  async updateRequest(client: PrismaClientLike, requestId: string, data: Prisma.ServiceRequestUncheckedUpdateInput): Promise<ServiceRequestRecord> {
    return client.serviceRequest.update({
      where: { id: requestId },
      data,
      include: requestInclude
    });
  }

  async createStatusHistory(
    client: PrismaClientLike,
    data: {
      serviceRequestId: string;
      fromStatus: RequestStatus | null;
      toStatus: RequestStatus;
      changedByUserId?: string;
    }
  ): Promise<void> {
    await client.serviceRequestStatusHistory.create({
      data: {
        serviceRequestId: data.serviceRequestId,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        changedByUserId: data.changedByUserId
      }
    });
  }

  async createIdempotencyRecord(
    client: PrismaClientLike,
    data: {
      idempotencyKey: string;
      userId: string;
      requestHash: string;
      responseSnapshotJson: Prisma.InputJsonValue;
      expiresAt: Date;
    }
  ): Promise<void> {
    await client.apiIdempotencyKey.create({
      data
    });
  }

  async getRequestItem(requestId: string, itemId: string) {
    return prisma.serviceRequestItem.findFirst({
      where: {
        id: itemId,
        serviceRequestId: requestId
      }
    });
  }

  async addRequestItem(client: PrismaClientLike, requestId: string, data: { label: string; quantity: number; note?: string }) {
    return client.serviceRequestItem.create({
      data: {
        serviceRequestId: requestId,
        label: data.label,
        quantity: data.quantity,
        note: data.note
      }
    });
  }

  async updateRequestItem(client: PrismaClientLike, itemId: string, data: Prisma.ServiceRequestItemUncheckedUpdateInput) {
    return client.serviceRequestItem.update({
      where: { id: itemId },
      data
    });
  }

  async removeRequestItem(client: PrismaClientLike, itemId: string): Promise<void> {
    await client.serviceRequestItem.delete({
      where: { id: itemId }
    });
  }

  async getAssignment(requestId: string, assignmentId: string) {
    return prisma.serviceRequestAssignment.findFirst({
      where: {
        id: assignmentId,
        serviceRequestId: requestId
      },
      include: {
        workerProfile: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                profile: {
                  select: profileSummarySelect
                }
              }
            }
          }
        },
        serviceRequest: {
          include: requestInclude
        }
      }
    });
  }

  async getAssignmentByWorkerProfile(requestId: string, workerProfileId: string) {
    return prisma.serviceRequestAssignment.findFirst({
      where: {
        serviceRequestId: requestId,
        workerProfileId
      }
    });
  }

  async countAssignments(requestId: string): Promise<number> {
    return prisma.serviceRequestAssignment.count({
      where: {
        serviceRequestId: requestId
      }
    });
  }

  async createAssignment(
    client: PrismaClientLike,
    data: { serviceRequestId: string; workerProfileId: string }
  ) {
    return client.serviceRequestAssignment.create({
      data,
      include: {
        workerProfile: {
          select: {
            id: true,
            userId: true,
            headline: true,
            verificationStatus: true,
            user: {
              select: {
                profile: {
                  select: profileSummarySelect
                }
              }
            }
          }
        }
      }
    });
  }

  async updateAssignment(
    client: PrismaClientLike,
    assignmentId: string,
    data: Prisma.ServiceRequestAssignmentUncheckedUpdateInput
  ) {
    return client.serviceRequestAssignment.update({
      where: { id: assignmentId },
      data,
      include: {
        workerProfile: {
          select: {
            id: true,
            userId: true,
            headline: true,
            verificationStatus: true,
            user: {
              select: {
                profile: {
                  select: profileSummarySelect
                }
              }
            }
          }
        }
      }
    });
  }

  async declinePendingAssignments(client: PrismaClientLike, requestId: string, excludeAssignmentId?: string): Promise<void> {
    await client.serviceRequestAssignment.updateMany({
      where: {
        serviceRequestId: requestId,
        assignmentStatus: AssignmentStatus.PENDING,
        ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {})
      },
      data: {
        assignmentStatus: AssignmentStatus.DECLINED,
        respondedAt: new Date()
      }
    });
  }

  async listStatusHistory(requestId: string): Promise<ServiceRequestStatusHistoryRecord[]> {
    return prisma.serviceRequestStatusHistory.findMany({
      where: {
        serviceRequestId: requestId
      },
      include: statusHistoryInclude,
      orderBy: {
        changedAt: "asc"
      }
    });
  }
}

export { RequestsRepository, requestInclude };
export type { ServiceRequestRecord, ServiceRequestStatusHistoryRecord };
