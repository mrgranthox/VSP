import { BookingStatus, Prisma, VerificationStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const workerProfileDetailInclude: Prisma.WorkerProfileInclude = {
  user: {
    select: {
      id: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
          cityId: true
        }
      }
    }
  },
  tradeCategories: {
    include: {
      tradeCategory: {
        select: {
          id: true,
          slug: true,
          name: true,
          iconUrl: true
        }
      }
    },
    orderBy: {
      tradeCategoryId: "asc"
    }
  },
  services: {
    orderBy: {
      createdAt: "asc"
    }
  },
  serviceAreas: {
    include: {
      city: {
        select: {
          id: true,
          slug: true,
          name: true,
          countryCode: true,
          currencyCode: true,
          timezone: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  },
  availabilityRules: {
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }]
  },
  availabilityExceptions: {
    orderBy: {
      startsAt: "asc"
    }
  },
  portfolioItems: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  },
  certifications: {
    orderBy: {
      createdAt: "asc"
    }
  },
  verificationRequests: {
    orderBy: {
      createdAt: "desc"
    }
  }
};

type WorkerProfileDetail = any;

class WorkerProfilesRepository {
  async getWorkerProfileByUserId(userId: string): Promise<WorkerProfileDetail | null> {
    return prisma.workerProfile.findUnique({
      where: { userId },
      include: workerProfileDetailInclude
    });
  }

  async getWorkerProfileById(workerProfileId: string): Promise<WorkerProfileDetail | null> {
    return prisma.workerProfile.findUnique({
      where: { id: workerProfileId },
      include: workerProfileDetailInclude
    });
  }

  async createWorkerProfile(
    userId: string,
    data: Omit<Prisma.WorkerProfileUncheckedCreateInput, "userId">
  ): Promise<WorkerProfileDetail> {
    return prisma.workerProfile.create({
      data: {
        ...data,
        userId
      },
      include: workerProfileDetailInclude
    });
  }

  async updateWorkerProfile(
    workerProfileId: string,
    data: Prisma.WorkerProfileUncheckedUpdateInput
  ): Promise<WorkerProfileDetail> {
    return prisma.workerProfile.update({
      where: { id: workerProfileId },
      data,
      include: workerProfileDetailInclude
    });
  }

  async recalculateAggregates(workerProfileId: string): Promise<WorkerProfileDetail> {
    const [reviewAggregate, jobsCompleted] = await Promise.all([
      prisma.review.aggregate({
        where: {
          booking: {
            workerProfileId
          }
        },
        _avg: {
          rating: true
        },
        _count: {
          _all: true
        }
      }),
      prisma.booking.count({
        where: {
          workerProfileId,
          status: BookingStatus.COMPLETED
        }
      })
    ]);

    return prisma.workerProfile.update({
      where: {
        id: workerProfileId
      },
      data: {
        avgRating: reviewAggregate._avg.rating ?? 0,
        totalReviews: reviewAggregate._count._all,
        jobsCompleted
      },
      include: workerProfileDetailInclude
    });
  }

  async cityExists(cityId: string): Promise<boolean> {
    const city = await prisma.cityConfig.findFirst({
      where: {
        id: cityId,
        isEnabled: true
      },
      select: { id: true }
    });

    return Boolean(city);
  }

  async tradeCategoryExists(tradeCategoryId: string): Promise<boolean> {
    const tradeCategory = await prisma.tradeCategory.findFirst({
      where: {
        id: tradeCategoryId,
        isEnabled: true
      },
      select: { id: true }
    });

    return Boolean(tradeCategory);
  }

  async addTradeCategory(workerProfileId: string, tradeCategoryId: string) {
    return prisma.workerTradeCategory.upsert({
      where: {
        workerProfileId_tradeCategoryId: {
          workerProfileId,
          tradeCategoryId
        }
      },
      update: {},
      create: {
        workerProfileId,
        tradeCategoryId
      },
      include: {
        tradeCategory: {
          select: {
            id: true,
            slug: true,
            name: true,
            iconUrl: true
          }
        }
      }
    });
  }

  async removeTradeCategory(workerProfileId: string, tradeCategoryId: string): Promise<number> {
    const result = await prisma.workerTradeCategory.deleteMany({
      where: {
        workerProfileId,
        tradeCategoryId
      }
    });

    return result.count;
  }

  async createService(
    workerProfileId: string,
    data: Omit<Prisma.WorkerServiceUncheckedCreateInput, "workerProfileId">
  ) {
    return prisma.workerService.create({
      data: {
        ...data,
        workerProfileId
      }
    });
  }

  async getService(workerProfileId: string, serviceId: string) {
    return prisma.workerService.findFirst({
      where: {
        id: serviceId,
        workerProfileId
      }
    });
  }

  async updateService(serviceId: string, data: Prisma.WorkerServiceUncheckedUpdateInput) {
    return prisma.workerService.update({
      where: { id: serviceId },
      data
    });
  }

  async deleteService(serviceId: string): Promise<void> {
    await prisma.workerService.delete({
      where: { id: serviceId }
    });
  }

  async createServiceArea(
    workerProfileId: string,
    data: Omit<Prisma.WorkerServiceAreaUncheckedCreateInput, "workerProfileId">
  ) {
    return prisma.workerServiceArea.create({
      data: {
        ...data,
        workerProfileId
      },
      include: {
        city: {
          select: {
            id: true,
            slug: true,
            name: true,
            countryCode: true,
            currencyCode: true,
            timezone: true
          }
        }
      }
    });
  }

  async getServiceArea(workerProfileId: string, areaId: string) {
    return prisma.workerServiceArea.findFirst({
      where: {
        id: areaId,
        workerProfileId
      },
      include: {
        city: {
          select: {
            id: true,
            slug: true,
            name: true,
            countryCode: true,
            currencyCode: true,
            timezone: true
          }
        }
      }
    });
  }

  async updateServiceArea(areaId: string, data: Prisma.WorkerServiceAreaUncheckedUpdateInput) {
    return prisma.workerServiceArea.update({
      where: { id: areaId },
      data,
      include: {
        city: {
          select: {
            id: true,
            slug: true,
            name: true,
            countryCode: true,
            currencyCode: true,
            timezone: true
          }
        }
      }
    });
  }

  async deleteServiceArea(areaId: string): Promise<void> {
    await prisma.workerServiceArea.delete({
      where: { id: areaId }
    });
  }

  async createAvailabilityRule(
    workerProfileId: string,
    data: Omit<Prisma.WorkerAvailabilityRuleUncheckedCreateInput, "workerProfileId">
  ) {
    return prisma.workerAvailabilityRule.create({
      data: {
        ...data,
        workerProfileId
      }
    });
  }

  async getAvailabilityRule(workerProfileId: string, ruleId: string) {
    return prisma.workerAvailabilityRule.findFirst({
      where: {
        id: ruleId,
        workerProfileId
      }
    });
  }

  async updateAvailabilityRule(ruleId: string, data: Prisma.WorkerAvailabilityRuleUncheckedUpdateInput) {
    return prisma.workerAvailabilityRule.update({
      where: { id: ruleId },
      data
    });
  }

  async deleteAvailabilityRule(ruleId: string): Promise<void> {
    await prisma.workerAvailabilityRule.delete({
      where: { id: ruleId }
    });
  }

  async createAvailabilityException(
    workerProfileId: string,
    data: Omit<Prisma.WorkerAvailabilityExceptionUncheckedCreateInput, "workerProfileId">
  ) {
    return prisma.workerAvailabilityException.create({
      data: {
        ...data,
        workerProfileId
      }
    });
  }

  async getAvailabilityException(workerProfileId: string, exceptionId: string) {
    return prisma.workerAvailabilityException.findFirst({
      where: {
        id: exceptionId,
        workerProfileId
      }
    });
  }

  async updateAvailabilityException(
    exceptionId: string,
    data: Prisma.WorkerAvailabilityExceptionUncheckedUpdateInput
  ) {
    return prisma.workerAvailabilityException.update({
      where: { id: exceptionId },
      data
    });
  }

  async deleteAvailabilityException(exceptionId: string): Promise<void> {
    await prisma.workerAvailabilityException.delete({
      where: { id: exceptionId }
    });
  }

  async createPortfolioItem(
    workerProfileId: string,
    data: Omit<Prisma.WorkerPortfolioItemUncheckedCreateInput, "workerProfileId">
  ) {
    return prisma.workerPortfolioItem.create({
      data: {
        ...data,
        workerProfileId
      }
    });
  }

  async getPortfolioItem(workerProfileId: string, itemId: string) {
    return prisma.workerPortfolioItem.findFirst({
      where: {
        id: itemId,
        workerProfileId
      }
    });
  }

  async updatePortfolioItem(itemId: string, data: Prisma.WorkerPortfolioItemUncheckedUpdateInput) {
    return prisma.workerPortfolioItem.update({
      where: { id: itemId },
      data
    });
  }

  async deletePortfolioItem(itemId: string): Promise<void> {
    await prisma.workerPortfolioItem.delete({
      where: { id: itemId }
    });
  }

  async createCertification(
    workerProfileId: string,
    data: Omit<Prisma.WorkerCertificationUncheckedCreateInput, "workerProfileId">
  ) {
    return prisma.workerCertification.create({
      data: {
        ...data,
        workerProfileId
      }
    });
  }

  async getCertification(workerProfileId: string, certificationId: string) {
    return prisma.workerCertification.findFirst({
      where: {
        id: certificationId,
        workerProfileId
      }
    });
  }

  async updateCertification(certificationId: string, data: Prisma.WorkerCertificationUncheckedUpdateInput) {
    return prisma.workerCertification.update({
      where: { id: certificationId },
      data
    });
  }

  async deleteCertification(certificationId: string): Promise<void> {
    await prisma.workerCertification.delete({
      where: { id: certificationId }
    });
  }

  async submitVerificationRequest(
    workerProfileId: string,
    notes?: string
  ): Promise<{ workerProfile: WorkerProfileDetail; verificationRequestId: string }> {
    return prisma.$transaction(async (tx) => {
      const verificationRequest = await tx.workerVerificationRequest.create({
        data: {
          workerProfileId,
          status: VerificationStatus.SUBMITTED,
          submittedAt: new Date(),
          reviewNotes: notes
        }
      });

      const workerProfile = await tx.workerProfile.update({
        where: { id: workerProfileId },
        data: {
          verificationStatus: VerificationStatus.SUBMITTED
        },
        include: workerProfileDetailInclude
      });

      return {
        workerProfile,
        verificationRequestId: verificationRequest.id
      };
    });
  }
}

export { WorkerProfilesRepository };
export type { WorkerProfileDetail };
