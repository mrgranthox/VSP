import { AssignmentStatus, BookingStatus, Prisma, RequestStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const profileSummarySelect = {
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  cityId: true
} satisfies Prisma.UserProfileSelect;

const bookingInclude = {
  customerUser: {
    select: {
      id: true,
      profile: {
        select: profileSummarySelect
      }
    }
  },
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
  },
  serviceRequest: {
    select: {
      id: true,
      customerUserId: true,
      title: true,
      status: true
    }
  },
  reschedules: {
    orderBy: {
      createdAt: "asc"
    },
    include: {
      requestedByUser: {
        select: {
          id: true,
          profile: {
            select: profileSummarySelect
          }
        }
      }
    }
  },
  cancellations: {
    orderBy: {
      createdAt: "asc"
    },
    include: {
      cancelledByUser: {
        select: {
          id: true,
          profile: {
            select: profileSummarySelect
          }
        }
      }
    }
  }
} satisfies Prisma.BookingInclude;

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;
type BookingRecord = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

class BookingsRepository {
  private buildAccessibleWhere(
    actorUserId: string,
    workerProfileId: string | undefined,
    filters: {
      status?: BookingStatus;
      from?: Date;
      to?: Date;
    }
  ): Prisma.BookingWhereInput {
    const accessConditions: Prisma.BookingWhereInput[] = [{ customerUserId: actorUserId }];

    if (workerProfileId) {
      accessConditions.push({
        workerProfileId
      });
    }

    return {
      OR: accessConditions,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            scheduledStart: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {})
            }
          }
        : {})
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

  async getServiceRequestBookingContext(serviceRequestId: string) {
    return prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: {
        id: true,
        customerUserId: true,
        title: true,
        status: true,
        booking: {
          select: {
            id: true
          }
        },
        assignments: {
          where: {
            assignmentStatus: AssignmentStatus.ACCEPTED
          },
          select: {
            id: true,
            workerProfileId: true,
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
        }
      }
    });
  }

  async getBookingById(bookingId: string, client: PrismaClientLike = prisma): Promise<BookingRecord | null> {
    return client.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude
    });
  }

  async listBookings(
    actorUserId: string,
    workerProfileId: string | undefined,
    filters: {
      status?: BookingStatus;
      from?: Date;
      to?: Date;
    },
    skip: number,
    take: number
  ) {
    return prisma.booking.findMany({
      where: this.buildAccessibleWhere(actorUserId, workerProfileId, filters),
      include: bookingInclude,
      orderBy: {
        scheduledStart: "desc"
      },
      skip,
      take
    });
  }

  async countBookings(
    actorUserId: string,
    workerProfileId: string | undefined,
    filters: {
      status?: BookingStatus;
      from?: Date;
      to?: Date;
    }
  ) {
    return prisma.booking.count({
      where: this.buildAccessibleWhere(actorUserId, workerProfileId, filters)
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

  async findConflictingBooking(
    workerProfileId: string,
    effectiveStart: Date,
    effectiveEnd: Date,
    excludeBookingId?: string
  ) {
    return prisma.booking.findFirst({
      where: {
        workerProfileId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.RESCHEDULED]
        },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        scheduledStart: {
          lt: effectiveEnd
        },
        scheduledEnd: {
          gt: effectiveStart
        }
      },
      select: {
        id: true
      }
    });
  }

  async createBooking(
    client: PrismaClientLike,
    data: {
      serviceRequestId: string;
      workerProfileId: string;
      customerUserId: string;
      scheduledStart: Date;
      scheduledEnd: Date;
    }
  ): Promise<BookingRecord> {
    return client.booking.create({
      data,
      include: bookingInclude
    });
  }

  async updateBooking(
    client: PrismaClientLike,
    bookingId: string,
    data: Prisma.BookingUncheckedUpdateInput
  ): Promise<BookingRecord> {
    return client.booking.update({
      where: { id: bookingId },
      data,
      include: bookingInclude
    });
  }

  async createReschedule(
    client: PrismaClientLike,
    data: {
      bookingId: string;
      requestedByUserId: string;
      oldStart: Date;
      oldEnd: Date;
      newStart: Date;
      newEnd: Date;
    }
  ) {
    return client.bookingReschedule.create({
      data,
      include: {
        requestedByUser: {
          select: {
            id: true,
            profile: {
              select: profileSummarySelect
            }
          }
        }
      }
    });
  }

  async getReschedule(bookingId: string, rescheduleId: string) {
    return prisma.bookingReschedule.findFirst({
      where: {
        id: rescheduleId,
        bookingId
      },
      include: {
        requestedByUser: {
          select: {
            id: true,
            profile: {
              select: profileSummarySelect
            }
          }
        },
        booking: {
          include: bookingInclude
        }
      }
    });
  }

  async getPendingReschedule(bookingId: string) {
    return prisma.bookingReschedule.findFirst({
      where: {
        bookingId,
        status: "PENDING"
      },
      select: {
        id: true
      }
    });
  }

  async updateReschedule(
    client: PrismaClientLike,
    rescheduleId: string,
    data: Prisma.BookingRescheduleUncheckedUpdateInput
  ) {
    return client.bookingReschedule.update({
      where: { id: rescheduleId },
      data,
      include: {
        requestedByUser: {
          select: {
            id: true,
            profile: {
              select: profileSummarySelect
            }
          }
        }
      }
    });
  }

  async cancelPendingReschedules(client: PrismaClientLike, bookingId: string, excludeRescheduleId?: string): Promise<void> {
    await client.bookingReschedule.updateMany({
      where: {
        bookingId,
        status: "PENDING",
        ...(excludeRescheduleId ? { id: { not: excludeRescheduleId } } : {})
      },
      data: {
        status: "CANCELLED"
      }
    });
  }

  async createCancellation(
    client: PrismaClientLike,
    data: {
      bookingId: string;
      cancelledByUserId: string;
      reason?: string;
    }
  ) {
    return client.bookingCancellation.create({
      data
    });
  }

  async updateServiceRequestStatus(client: PrismaClientLike, serviceRequestId: string, status: RequestStatus): Promise<void> {
    await client.serviceRequest.update({
      where: { id: serviceRequestId },
      data: {
        status
      }
    });
  }

  async createServiceRequestStatusHistory(
    client: PrismaClientLike,
    data: {
      serviceRequestId: string;
      fromStatus: RequestStatus;
      toStatus: RequestStatus;
      changedByUserId: string;
    }
  ): Promise<void> {
    await client.serviceRequestStatusHistory.create({
      data
    });
  }
}

export { BookingsRepository };
export type { BookingRecord };
