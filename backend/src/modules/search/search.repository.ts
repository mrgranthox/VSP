import { BookingStatus, UserStatus, VerificationStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const workerSearchInclude: any = {
  user: {
    select: {
      id: true,
      status: true,
      lastLoginAt: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
          cityId: true,
          lat: true,
          lng: true,
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
    }
  },
  services: {
    where: {
      isEnabled: true
    },
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
  portfolioItems: {
    select: {
      id: true
    }
  },
  certifications: {
    select: {
      id: true,
      verificationStatus: true
    }
  },
  availabilityRules: {
    select: {
      id: true
    }
  }
};

class SearchRepository {
  async listTradeCategories() {
    return prisma.tradeCategory.findMany({
      where: {
        isEnabled: true
      },
      orderBy: {
        name: "asc"
      }
    });
  }

  async listCities() {
    return prisma.cityConfig.findMany({
      where: {
        isEnabled: true
      },
      orderBy: {
        name: "asc"
      }
    });
  }

  async listEligibleWorkerCandidates(filters?: { tradeCategoryId?: string; cityId?: string }): Promise<any[]> {
    return prisma.workerProfile.findMany({
      where: {
        verificationStatus: VerificationStatus.APPROVED,
        user: {
          status: UserStatus.ACTIVE
        },
        ...(filters?.tradeCategoryId
          ? {
              tradeCategories: {
                some: {
                  tradeCategoryId: filters.tradeCategoryId
                }
              }
            }
          : {}),
        ...(filters?.cityId
          ? {
              OR: [
                {
                  serviceAreas: {
                    some: {
                      cityId: filters.cityId
                    }
                  }
                },
                {
                  user: {
                    profile: {
                      cityId: filters.cityId
                    }
                  }
                }
              ]
            }
          : {})
      },
      include: workerSearchInclude
    });
  }

  async getBlockingModerationActions() {
    return prisma.moderationAction.findMany({
      where: {
        OR: [{ entityType: "WORKER_PROFILE" }, { entityType: "USER" }],
        actionType: {
          in: ["SUSPEND", "BLOCK", "DELETE", "BAN"]
        }
      },
      select: {
        entityType: true,
        entityId: true
      }
    });
  }

  async createSearchImpression(data: {
    userId?: string;
    workerProfileId: string;
    rankPosition: number;
    queryText?: string;
    cityId?: string;
  }) {
    return prisma.searchImpression.create({
      data: {
        userId: data.userId,
        workerProfileId: data.workerProfileId,
        rankPosition: data.rankPosition,
        queryText: data.queryText,
        cityId: data.cityId
      }
    });
  }

  async getSuggestionTrades(queryText: string, limit: number) {
    return prisma.tradeCategory.findMany({
      where: {
        isEnabled: true,
        OR: [
          {
            name: {
              contains: queryText,
              mode: "insensitive"
            }
          },
          {
            slug: {
              contains: queryText,
              mode: "insensitive"
            }
          }
        ]
      },
      orderBy: {
        name: "asc"
      },
      take: limit
    });
  }

  async getSuggestionCities(queryText: string, limit: number) {
    return prisma.cityConfig.findMany({
      where: {
        isEnabled: true,
        OR: [
          {
            name: {
              contains: queryText,
              mode: "insensitive"
            }
          },
          {
            slug: {
              contains: queryText,
              mode: "insensitive"
            }
          }
        ]
      },
      orderBy: {
        name: "asc"
      },
      take: limit
    });
  }

  async getSuggestionWorkers(queryText: string, limit: number): Promise<any[]> {
    return prisma.workerProfile.findMany({
      where: {
        verificationStatus: VerificationStatus.APPROVED,
        user: {
          status: UserStatus.ACTIVE
        },
        OR: [
          {
            headline: {
              contains: queryText,
              mode: "insensitive"
            }
          },
          {
            bio: {
              contains: queryText,
              mode: "insensitive"
            }
          },
          {
            user: {
              profile: {
                displayName: {
                  contains: queryText,
                  mode: "insensitive"
                }
              }
            }
          },
          {
            tradeCategories: {
              some: {
                tradeCategory: {
                  name: {
                    contains: queryText,
                    mode: "insensitive"
                  }
                }
              }
            }
          }
        ]
      },
      include: workerSearchInclude,
      take: limit
    });
  }

  async getSearchRankingWeights() {
    return prisma.systemConfig.findUnique({
      where: {
        configKey: "search_ranking_weights"
      },
      select: {
        valueJson: true
      }
    });
  }

  async getRecommendationSignals(userId: string) {
    const [profile, savedWorkers, completedBookings] = await Promise.all([
      prisma.userProfile.findUnique({
        where: {
          userId
        },
        select: {
          cityId: true
        }
      }),
      prisma.customerSavedWorker.findMany({
        where: {
          userId
        },
        select: {
          workerProfileId: true
        }
      }),
      prisma.booking.findMany({
        where: {
          customerUserId: userId,
          status: BookingStatus.COMPLETED
        },
        select: {
          workerProfileId: true
        },
        orderBy: {
          completedAt: "desc"
        },
        take: 5
      })
    ]);

    return {
      cityId: profile?.cityId ?? null,
      savedWorkerIds: savedWorkers.map((item) => item.workerProfileId),
      completedWorkerIds: completedBookings.map((item) => item.workerProfileId)
    };
  }

  async getRecentPosts(skip: number, take: number) {
    return prisma.post.findMany({
      where: {
        visibility: "PUBLIC",
        isDeleted: false
      },
      include: {
        authorUser: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        media: {
          orderBy: {
            sortOrder: "asc"
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take
    });
  }

  async countRecentPosts() {
    return prisma.post.count({
      where: {
        visibility: "PUBLIC",
        isDeleted: false
      }
    });
  }

  async getWorkerCandidateById(workerProfileId: string): Promise<any | null> {
    return prisma.workerProfile.findFirst({
      where: {
        id: workerProfileId
      },
      include: workerSearchInclude
    });
  }

  async findWorkerProfileByUserId(userId: string) {
    return prisma.workerProfile.findUnique({
      where: {
        userId
      },
      select: {
        id: true
      }
    });
  }
}

export { SearchRepository };
