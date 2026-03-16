process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_ENABLED = "false";
process.env.TWILIO_VERIFY_MOCK_MODE = "true";

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";

import { UserStatus, VerificationStatus, VisibilityScope } from "@prisma/client";
import request from "supertest";

import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { redis, redisQueue } from "../../lib/redis";

const api = request(app);
const password = "Change-This-Password-123!";

const buildEmail = (label: string): string => `itest-search-${label}-${randomUUID()}@example.com`;
const buildSlug = (label: string): string => `itest-search-${label}-${randomUUID().slice(0, 8)}`;

const login = async (email: string): Promise<string> => {
  const response = await api.post("/api/v1/auth/login").set("x-device-type", "web").send({
    email,
    password
  });

  assert.equal(response.status, 200);
  return response.body.data.tokenPair.accessToken as string;
};

const createUserAndLogin = async (label: string) => {
  const email = buildEmail(label);
  const registerResponse = await api.post("/api/v1/auth/register").send({
    email,
    password,
    firstName: "Search",
    lastName: "Tester"
  });

  assert.equal(registerResponse.status, 201);

  return {
    email,
    userId: registerResponse.body.data.userId as string,
    accessToken: await login(email)
  };
};

const cleanupSearchData = async (): Promise<void> => {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "itest-search-"
      }
    }
  });

  await prisma.tradeCategory.deleteMany({
    where: {
      slug: {
        startsWith: "itest-search-"
      }
    }
  });

  await prisma.cityConfig.deleteMany({
    where: {
      slug: {
        startsWith: "itest-search-"
      }
    }
  });
};

before(async () => {
  await cleanupSearchData();
});

after(async () => {
  await cleanupSearchData();
  await prisma.$disconnect();
  await Promise.allSettled([redis.quit(), redisQueue.quit()]);
});

test("search module covers taxonomies, worker search, suggestions, impressions, and discovery endpoints", async () => {
  const actor = await createUserAndLogin("actor");
  const searchToken = randomUUID().slice(0, 8);

  const [tradeElectrical, tradePlumbing] = await Promise.all([
    prisma.tradeCategory.create({
      data: {
        slug: buildSlug("electrical"),
        name: `Electrical ${searchToken}`,
        isEnabled: true
      }
    }),
    prisma.tradeCategory.create({
      data: {
        slug: buildSlug("plumbing"),
        name: "Plumbing Works",
        isEnabled: true
      }
    })
  ]);

  const [cityAccra, cityTema] = await Promise.all([
    prisma.cityConfig.create({
      data: {
        slug: buildSlug("accra"),
        name: "Accra",
        countryCode: "GH",
        currencyCode: "GHS",
        timezone: "Africa/Accra",
        defaultSearchRadiusKm: 25,
        isEnabled: true
      }
    }),
    prisma.cityConfig.create({
      data: {
        slug: buildSlug("tema"),
        name: "Tema",
        countryCode: "GH",
        currencyCode: "GHS",
        timezone: "Africa/Accra",
        defaultSearchRadiusKm: 25,
        isEnabled: true
      }
    })
  ]);

  await prisma.userProfile.update({
    where: {
      userId: actor.userId
    },
    data: {
      cityId: cityAccra.id,
      lat: 5.6037,
      lng: -0.187
    }
  });

  const featuredWorkerUser = await prisma.user.create({
    data: {
      email: buildEmail("featured-worker"),
      passwordHash: "not-used",
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date("2026-03-15T10:00:00.000Z"),
      profile: {
        create: {
          firstName: "Ama",
          lastName: "Electric",
          displayName: "Ama Electric",
          avatarUrl: "https://cdn.example.com/ama.jpg",
          cityId: cityAccra.id,
          lat: 5.6037,
          lng: -0.187
        }
      },
      workerProfile: {
        create: {
          headline: `Certified electrician ${searchToken} for homes`,
          bio: `Experienced electrician ${searchToken} with over one hundred characters in this biography to boost profile completeness and search ranking.`,
          experienceYears: 8,
          verificationStatus: VerificationStatus.APPROVED,
          avgRating: 4.9,
          totalReviews: 25,
          jobsCompleted: 31,
          responseRate: 92.5,
          serviceRadiusKm: 25,
          isFeatured: true,
          tradeCategories: {
            create: [{ tradeCategoryId: tradeElectrical.id }]
          },
          services: {
            create: [{ title: "Home Rewiring", description: "Fast rewiring for homes", basePriceMinor: 25000, currencyCode: "GHS" }]
          },
          serviceAreas: {
            create: [{ cityId: cityAccra.id, centerLat: 5.6037, centerLng: -0.187, radiusKm: 25 }]
          },
          portfolioItems: {
            create: [{ mediaUrl: "https://cdn.example.com/work.jpg", sortOrder: 1 }]
          },
          certifications: {
            create: [{ title: "Electrical Safety", certificateUrl: "private://cert", verificationStatus: VerificationStatus.APPROVED }]
          },
          availabilityRules: {
            create: [
              { dayOfWeek: 1, startMinute: 480, endMinute: 960, timezone: "Africa/Accra" },
              { dayOfWeek: 2, startMinute: 480, endMinute: 960, timezone: "Africa/Accra" }
            ]
          }
        }
      },
      posts: {
        create: [
          {
            body: "Recent public project update",
            visibility: VisibilityScope.PUBLIC,
            media: {
              create: [{ mediaUrl: "https://cdn.example.com/post.jpg", mediaType: "image/jpeg", sortOrder: 1 }]
            }
          },
          {
            body: "Hidden private project",
            visibility: VisibilityScope.PRIVATE
          }
        ]
      }
    },
    include: {
      workerProfile: true
    }
  });

  const plumbingWorkerUser = await prisma.user.create({
    data: {
      email: buildEmail("plumbing-worker"),
      passwordHash: "not-used",
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date("2026-03-14T10:00:00.000Z"),
      profile: {
        create: {
          firstName: "Kojo",
          lastName: "Plumber",
          displayName: "Kojo Plumber",
          cityId: cityTema.id,
          lat: 5.6698,
          lng: -0.0166
        }
      },
      workerProfile: {
        create: {
          headline: "Trusted plumber",
          bio: "Reliable plumbing services across Tema.",
          experienceYears: 5,
          verificationStatus: VerificationStatus.APPROVED,
          avgRating: 4.4,
          totalReviews: 10,
          jobsCompleted: 14,
          responseRate: 80,
          serviceRadiusKm: 15,
          tradeCategories: {
            create: [{ tradeCategoryId: tradePlumbing.id }]
          },
          serviceAreas: {
            create: [{ cityId: cityTema.id, centerLat: 5.6698, centerLng: -0.0166, radiusKm: 15 }]
          },
          services: {
            create: [{ title: "Leak Repair", description: "Emergency leak repair", basePriceMinor: 15000, currencyCode: "GHS" }]
          }
        }
      }
    },
    include: {
      workerProfile: true
    }
  });

  await prisma.user.create({
    data: {
      email: buildEmail("draft-worker"),
      passwordHash: "not-used",
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: "Draft",
          lastName: "Worker"
        }
      },
      workerProfile: {
        create: {
          headline: "Should not appear",
          verificationStatus: VerificationStatus.DRAFT,
          tradeCategories: {
            create: [{ tradeCategoryId: tradeElectrical.id }]
          },
          serviceAreas: {
            create: [{ cityId: cityAccra.id, centerLat: 5.603, centerLng: -0.18, radiusKm: 20 }]
          }
        }
      }
    }
  });

  await prisma.customerSavedWorker.create({
    data: {
      userId: actor.userId,
      workerProfileId: featuredWorkerUser.workerProfile!.id
    }
  });

  const tradesResponse = await api.get("/api/v1/trade-categories");
  assert.equal(tradesResponse.status, 200);
  assert.equal(tradesResponse.body.data.length >= 2, true);

  const citiesResponse = await api.get("/api/v1/cities");
  assert.equal(citiesResponse.status, 200);
  assert.equal(citiesResponse.body.data.length >= 2, true);

  const searchWorkersResponse = await api.get("/api/v1/search/workers").query({
    lat: 5.6037,
    lng: -0.187,
    radiusKm: 30,
    tradeCategoryId: tradeElectrical.id,
    q: "electrician",
    page: 1,
    limit: 10
  });

  assert.equal(searchWorkersResponse.status, 200);
  assert.equal(searchWorkersResponse.body.data.length, 1);
  assert.equal(searchWorkersResponse.body.data[0].id, featuredWorkerUser.workerProfile!.id);
  assert.equal(searchWorkersResponse.body.data[0].isFeatured, true);

  const nearbyResponse = await api.get("/api/v1/search/workers/nearby").query({
    lat: 5.6037,
    lng: -0.187,
    radiusKm: 30,
    page: 1,
    limit: 10
  });

  assert.equal(nearbyResponse.status, 200);
  assert.equal(nearbyResponse.body.data.length >= 1, true);

  const mapResponse = await api.get("/api/v1/search/workers/map").query({
    neLat: 5.7,
    neLng: -0.1,
    swLat: 5.55,
    swLng: -0.25,
    page: 1,
    limit: 10
  });

  assert.equal(mapResponse.status, 200);
  assert.equal(mapResponse.body.data.some((item: any) => item.id === featuredWorkerUser.workerProfile!.id), true);
  assert.equal(mapResponse.body.data.some((item: any) => item.id === plumbingWorkerUser.workerProfile!.id), false);

  const suggestionsResponse = await api.get("/api/v1/search/suggestions").query({
    q: searchToken,
    limit: 10
  });

  assert.equal(suggestionsResponse.status, 200);
  assert.equal(suggestionsResponse.body.data.trades.some((item: any) => item.id === tradeElectrical.id), true);
  assert.equal(suggestionsResponse.body.data.workers.some((item: any) => item.id === featuredWorkerUser.workerProfile!.id), true);

  const impressionResponse = await api
    .post("/api/v1/search/impressions")
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .send({
      workerProfileId: featuredWorkerUser.workerProfile!.id,
      rankPosition: 1,
      queryText: "electrician",
      cityId: cityAccra.id
    });

  assert.equal(impressionResponse.status, 201);
  assert.equal(impressionResponse.body.data.workerProfileId, featuredWorkerUser.workerProfile!.id);

  const featuredDiscoveryResponse = await api.get("/api/v1/discovery/featured-workers").query({
    page: 1,
    limit: 10
  });

  assert.equal(featuredDiscoveryResponse.status, 200);
  assert.equal(featuredDiscoveryResponse.body.data[0].id, featuredWorkerUser.workerProfile!.id);

  const recommendedResponse = await api
    .get("/api/v1/discovery/recommended-workers")
    .set("Authorization", `Bearer ${actor.accessToken}`)
    .query({
      page: 1,
      limit: 10
    });

  assert.equal(recommendedResponse.status, 200);
  assert.equal(recommendedResponse.body.data[0].id, featuredWorkerUser.workerProfile!.id);

  const recentPostsResponse = await api.get("/api/v1/discovery/recent-posts").query({
    page: 1,
    limit: 10
  });

  assert.equal(recentPostsResponse.status, 200);
  assert.equal(
    recentPostsResponse.body.data.some((item: any) => item.body === "Recent public project update"),
    true
  );
  assert.equal(
    recentPostsResponse.body.data.some((item: any) => item.body === "Hidden private project"),
    false
  );
});
