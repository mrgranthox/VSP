import { redis } from "../../lib/redis";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import { SearchIndexer, SEARCH_NEARBY_VERSION_KEY } from "./search.indexer";
import { SearchRepository } from "./search.repository";

const DEFAULT_SEARCH_RADIUS_KM = 25;

const defaultRankingWeights = {
  text_relevance: 0.4,
  avg_rating: 0.2,
  is_featured: 0.15,
  profile_complete: 0.1,
  response_rate: 0.1,
  distance: 0.05
};

const decimalToNumber = (value: any): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value.toNumber === "function") {
    return value.toNumber();
  }

  return Number(value);
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const normalizeText = (value?: string | null): string => (value ?? "").trim().toLowerCase();

const roundToTwo = (value: number): string => value.toFixed(2);

class SearchService {
  constructor(
    private readonly repository: SearchRepository = new SearchRepository(),
    private readonly indexer: SearchIndexer = new SearchIndexer()
  ) {}

  private async getCachedJson<T>(key: string): Promise<T | null> {
    const cachedValue = await redis.get(key);

    if (!cachedValue) {
      return null;
    }

    return JSON.parse(cachedValue) as T;
  }

  private async setCachedJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  private async getNearbyCacheVersion(): Promise<string> {
    return (await redis.get(SEARCH_NEARBY_VERSION_KEY)) ?? "0";
  }

  private getWorkerLocations(worker: any): Array<{ lat: number; lng: number; radiusKm: number; city: any | null }> {
    const serviceAreaLocations = worker.serviceAreas
      .map((area: any) => {
        const lat = decimalToNumber(area.centerLat);
        const lng = decimalToNumber(area.centerLng);

        if (lat === null || lng === null) {
          return null;
        }

        return {
          lat,
          lng,
          radiusKm: area.radiusKm ?? worker.serviceRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM,
          city: area.city ?? null
        };
      })
      .filter(Boolean) as Array<{ lat: number; lng: number; radiusKm: number; city: any | null }>;

    if (serviceAreaLocations.length > 0) {
      return serviceAreaLocations;
    }

    const profileLat = decimalToNumber(worker.user?.profile?.lat);
    const profileLng = decimalToNumber(worker.user?.profile?.lng);

    if (profileLat === null || profileLng === null) {
      return [];
    }

    return [
      {
        lat: profileLat,
        lng: profileLng,
        radiusKm: worker.serviceRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM,
        city: worker.user?.profile?.city ?? null
      }
    ];
  }

  private getPrimaryCity(worker: any) {
    return this.getWorkerLocations(worker)[0]?.city ?? worker.user?.profile?.city ?? null;
  }

  private computeProfileCompleteScore(worker: any): number {
    let score = 0;

    if (worker.headline) {
      score += 10;
    }

    if ((worker.bio ?? "").length >= 100) {
      score += 10;
    }

    if (worker.user?.profile?.avatarUrl) {
      score += 10;
    }

    if ((worker.tradeCategories ?? []).length >= 1) {
      score += 10;
    }

    if ((worker.services ?? []).length >= 1) {
      score += 10;
    }

    if ((worker.serviceAreas ?? []).length >= 1) {
      score += 10;
    }

    if ((worker.portfolioItems ?? []).length >= 1) {
      score += 15;
    }

    if ((worker.certifications ?? []).some((item: any) => item.verificationStatus === "APPROVED")) {
      score += 10;
    }

    if ((worker.availabilityRules ?? []).length >= 2) {
      score += 10;
    }

    if ((worker.experienceYears ?? 0) > 0) {
      score += 5;
    }

    return score;
  }

  private getTextRelevance(queryText: string | undefined, worker: any): number {
    const normalizedQuery = normalizeText(queryText);

    if (!normalizedQuery) {
      return 0;
    }

    const haystacks = [
      normalizeText(worker.headline),
      normalizeText(worker.bio),
      normalizeText(worker.user?.profile?.displayName),
      normalizeText(worker.user?.profile?.firstName),
      normalizeText(worker.user?.profile?.lastName),
      ...worker.tradeCategories.map((item: any) => normalizeText(item.tradeCategory.name)),
      ...worker.services.map((service: any) => normalizeText(service.title))
    ];

    let score = 0;

    for (const haystack of haystacks) {
      if (!haystack) {
        continue;
      }

      if (haystack === normalizedQuery) {
        score = Math.max(score, 1);
      } else if (haystack.startsWith(normalizedQuery)) {
        score = Math.max(score, 0.85);
      } else if (haystack.includes(normalizedQuery)) {
        score = Math.max(score, 0.65);
      }
    }

    return score;
  }

  private mapWorkerSummary(worker: any, distanceKm: number | null) {
    const primaryCity = this.getPrimaryCity(worker);

    return {
      id: worker.id,
      userId: worker.userId,
      displayName: worker.user?.profile?.displayName ?? ([worker.user?.profile?.firstName, worker.user?.profile?.lastName].filter(Boolean).join(" ").trim() || null),
      avatarUrl: worker.user?.profile?.avatarUrl ?? null,
      headline: worker.headline,
      bio: worker.bio,
      experienceYears: worker.experienceYears,
      verificationStatus: worker.verificationStatus,
      avgRating: decimalToNumber(worker.avgRating) ?? 0,
      totalReviews: worker.totalReviews,
      jobsCompleted: worker.jobsCompleted,
      responseRate: decimalToNumber(worker.responseRate) ?? 0,
      isFeatured: worker.isFeatured,
      serviceRadiusKm: worker.serviceRadiusKm,
      profileCompleteScore: this.computeProfileCompleteScore(worker),
      lastActiveAt: worker.user?.lastLoginAt ?? worker.updatedAt,
      distanceKm,
      city: primaryCity
        ? {
            id: primaryCity.id,
            slug: primaryCity.slug,
            name: primaryCity.name,
            countryCode: primaryCity.countryCode,
            currencyCode: primaryCity.currencyCode,
            timezone: primaryCity.timezone
          }
        : null,
      tradeCategories: worker.tradeCategories.map((item: any) => item.tradeCategory),
      services: worker.services.map((service: any) => ({
        id: service.id,
        title: service.title,
        description: service.description,
        basePriceMinor: service.basePriceMinor,
        currencyCode: service.currencyCode
      })),
      location: this.getWorkerLocations(worker)[0]
        ? {
            lat: this.getWorkerLocations(worker)[0].lat,
            lng: this.getWorkerLocations(worker)[0].lng
          }
        : null
    };
  }

  private async getRankingWeights() {
    const config = await this.repository.getSearchRankingWeights();
    const weights = config?.valueJson;

    if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
      return defaultRankingWeights;
    }

    return {
      ...defaultRankingWeights,
      ...(weights as Record<string, number>)
    };
  }

  private async getBlockedEntitySets(): Promise<{ workerIds: Set<string>; userIds: Set<string> }> {
    const actions = await this.repository.getBlockingModerationActions();

    return actions.reduce(
      (acc, action) => {
        if (action.entityType === "WORKER_PROFILE") {
          acc.workerIds.add(action.entityId);
        }

        if (action.entityType === "USER") {
          acc.userIds.add(action.entityId);
        }

        return acc;
      },
      { workerIds: new Set<string>(), userIds: new Set<string>() }
    );
  }

  private filterEligibleWorkers(workers: any[], blocked: { workerIds: Set<string>; userIds: Set<string> }) {
    return workers.filter((worker: any) => !blocked.workerIds.has(worker.id) && !blocked.userIds.has(worker.userId));
  }

  private scoreWorkers(
    workers: any[],
    options: {
      lat: number;
      lng: number;
      radiusKm?: number;
      q?: string;
      minRating?: number;
      isFeatured?: boolean;
      cityId?: string;
    },
    rankingWeights: Record<string, number>
  ) {
    const maxDistance = options.radiusKm ?? DEFAULT_SEARCH_RADIUS_KM;

    return workers
      .map((worker: any) => {
        const locations = this.getWorkerLocations(worker);

        if (locations.length === 0) {
          return null;
        }

        const distances = locations.map((location) => haversineKm(options.lat, options.lng, location.lat, location.lng));
        const distanceKm = Math.min(...distances);
        const serviceCoverageKm = Math.max(...locations.map((location) => location.radiusKm));

        if (distanceKm > maxDistance || distanceKm > serviceCoverageKm) {
          return null;
        }

        const primaryCity = this.getPrimaryCity(worker);
        const avgRating = decimalToNumber(worker.avgRating) ?? 0;

        if (options.minRating !== undefined && avgRating < options.minRating) {
          return null;
        }

        if (options.isFeatured !== undefined && worker.isFeatured !== options.isFeatured) {
          return null;
        }

        if (options.cityId && primaryCity?.id !== options.cityId && !worker.serviceAreas.some((item: any) => item.cityId === options.cityId)) {
          return null;
        }

        const profileCompleteScore = this.computeProfileCompleteScore(worker);
        const textScore = this.getTextRelevance(options.q, worker);
        const distanceScore = 1 - Math.min(distanceKm, maxDistance) / maxDistance;
        const rankScore =
          textScore * rankingWeights.text_relevance +
          (avgRating / 5) * rankingWeights.avg_rating +
          (worker.isFeatured ? 1 : 0) * rankingWeights.is_featured +
          (profileCompleteScore / 100) * rankingWeights.profile_complete +
          ((decimalToNumber(worker.responseRate) ?? 0) / 100) * rankingWeights.response_rate +
          distanceScore * rankingWeights.distance;

        return {
          ...this.mapWorkerSummary(worker, Number(distanceKm.toFixed(2))),
          rankScore
        };
      })
      .filter(Boolean)
      .sort((left: any, right: any) => {
        if (right.rankScore !== left.rankScore) {
          return right.rankScore - left.rankScore;
        }

        if (right.avgRating !== left.avgRating) {
          return right.avgRating - left.avgRating;
        }

        if (right.totalReviews !== left.totalReviews) {
          return right.totalReviews - left.totalReviews;
        }

        return new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime();
      });
  }

  async getTradeCategories() {
    const cacheKey = "trade:all";
    const cached = await this.getCachedJson<any[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const tradeCategories = await this.repository.listTradeCategories();
    await this.setCachedJson(cacheKey, tradeCategories, 24 * 60 * 60);

    return tradeCategories;
  }

  async getCities() {
    const cacheKey = "city:all";
    const cached = await this.getCachedJson<any[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const cities = await this.repository.listCities();
    await this.setCachedJson(cacheKey, cities, 10 * 60);

    return cities;
  }

  async searchWorkers(query: {
    lat: number;
    lng: number;
    radiusKm?: number;
    tradeCategoryId?: string;
    cityId?: string;
    minRating?: number;
    isFeatured?: boolean;
    q?: string;
    page: number;
    limit: number;
  }) {
    const [workers, blockedEntities, rankingWeights] = await Promise.all([
      this.repository.listEligibleWorkerCandidates({
        tradeCategoryId: query.tradeCategoryId,
        cityId: query.cityId
      }),
      this.getBlockedEntitySets(),
      this.getRankingWeights()
    ]);

    const filteredWorkers = this.filterEligibleWorkers(workers, blockedEntities);
    const scoredWorkers = this.scoreWorkers(filteredWorkers, query, rankingWeights);
    const args = getPaginationArgs({ page: query.page, limit: query.limit });

    return {
      data: scoredWorkers.slice(args.skip, args.skip + args.take),
      pagination: buildPagination(query.page, query.limit, scoredWorkers.length)
    };
  }

  async searchWorkersNearby(query: {
    lat: number;
    lng: number;
    radiusKm?: number;
    tradeCategoryId?: string;
    cityId?: string;
    minRating?: number;
    isFeatured?: boolean;
    q?: string;
    page: number;
    limit: number;
  }) {
    const cacheVersion = await this.getNearbyCacheVersion();
    const cacheKey = [
      "search:nearby",
      `v${cacheVersion}`,
      roundToTwo(query.lat),
      roundToTwo(query.lng),
      query.tradeCategoryId ?? "all",
      query.radiusKm ?? DEFAULT_SEARCH_RADIUS_KM,
      query.page,
      query.limit
    ].join(":");
    const cached = await this.getCachedJson<{ data: any[]; pagination: any }>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.searchWorkers(query);
    await this.setCachedJson(cacheKey, result, 30);

    return result;
  }

  async searchWorkersMap(query: {
    neLat: number;
    neLng: number;
    swLat: number;
    swLng: number;
    tradeCategoryId?: string;
    page: number;
    limit: number;
  }) {
    const [workers, blockedEntities] = await Promise.all([
      this.repository.listEligibleWorkerCandidates({
        tradeCategoryId: query.tradeCategoryId
      }),
      this.getBlockedEntitySets()
    ]);

    const filteredWorkers = this.filterEligibleWorkers(workers, blockedEntities);
    const inBounds = filteredWorkers
      .map((worker: any) => {
        const location = this.getWorkerLocations(worker).find(
          (item) => item.lat <= query.neLat && item.lat >= query.swLat && item.lng <= query.neLng && item.lng >= query.swLng
        );

        if (!location) {
          return null;
        }

        return this.mapWorkerSummary(worker, null);
      })
      .filter(Boolean);

    const args = getPaginationArgs({ page: query.page, limit: query.limit });

    return {
      data: inBounds.slice(args.skip, args.skip + args.take),
      pagination: buildPagination(query.page, query.limit, inBounds.length)
    };
  }

  async getSuggestions(queryText: string, limit: number) {
    const [trades, cities, workers, blockedEntities] = await Promise.all([
      this.repository.getSuggestionTrades(queryText, limit),
      this.repository.getSuggestionCities(queryText, limit),
      this.repository.getSuggestionWorkers(queryText, limit),
      this.getBlockedEntitySets()
    ]);

    return {
      trades: trades.map((trade) => ({
        id: trade.id,
        slug: trade.slug,
        name: trade.name,
        iconUrl: trade.iconUrl
      })),
      cities: cities.map((city) => ({
        id: city.id,
        slug: city.slug,
        name: city.name,
        countryCode: city.countryCode
      })),
      workers: this.filterEligibleWorkers(workers, blockedEntities).slice(0, limit).map((worker: any) => ({
        id: worker.id,
        headline: worker.headline,
        displayName: worker.user?.profile?.displayName ?? ([worker.user?.profile?.firstName, worker.user?.profile?.lastName].filter(Boolean).join(" ").trim() || null),
        tradeCategories: worker.tradeCategories.map((item: any) => item.tradeCategory.name)
      }))
    };
  }

  async logImpression(actor: { userId: string } | undefined, data: { workerProfileId: string; rankPosition: number; queryText?: string; cityId?: string }) {
    return this.repository.createSearchImpression({
      userId: actor?.userId,
      workerProfileId: data.workerProfileId,
      rankPosition: data.rankPosition,
      queryText: data.queryText,
      cityId: data.cityId
    });
  }

  async getFeaturedWorkers(pagination: PaginationInput) {
    const [workers, blockedEntities] = await Promise.all([
      this.repository.listEligibleWorkerCandidates(),
      this.getBlockedEntitySets()
    ]);

    const featuredWorkers = this.filterEligibleWorkers(workers, blockedEntities)
      .filter((worker: any) => worker.isFeatured)
      .map((worker: any) => this.mapWorkerSummary(worker, null))
      .sort((left: any, right: any) => {
        if (right.avgRating !== left.avgRating) {
          return right.avgRating - left.avgRating;
        }

        return right.totalReviews - left.totalReviews;
      });

    const args = getPaginationArgs(pagination);

    return {
      data: featuredWorkers.slice(args.skip, args.skip + args.take),
      pagination: buildPagination(pagination.page, pagination.limit, featuredWorkers.length)
    };
  }

  async getRecommendedWorkers(actor: { userId: string } | undefined, pagination: PaginationInput) {
    const [workers, blockedEntities, signals] = await Promise.all([
      this.repository.listEligibleWorkerCandidates(),
      this.getBlockedEntitySets(),
      actor ? this.repository.getRecommendationSignals(actor.userId) : Promise.resolve(null)
    ]);

    const filteredWorkers = this.filterEligibleWorkers(workers, blockedEntities);
    const savedIds = new Set(signals?.savedWorkerIds ?? []);
    const completedIds = new Set(signals?.completedWorkerIds ?? []);

    const recommended = filteredWorkers
      .map((worker: any) => {
        const base = this.mapWorkerSummary(worker, null);
        let recommendationScore = base.avgRating + base.totalReviews / 100;

        if (savedIds.has(worker.id)) {
          recommendationScore += 4;
        }

        if (completedIds.has(worker.id)) {
          recommendationScore += 3;
        }

        if (signals?.cityId && (base.city?.id === signals.cityId || worker.serviceAreas.some((item: any) => item.cityId === signals.cityId))) {
          recommendationScore += 1.5;
        }

        if (worker.isFeatured) {
          recommendationScore += 0.5;
        }

        return {
          ...base,
          recommendationScore
        };
      })
      .sort((left: any, right: any) => {
        if (right.recommendationScore !== left.recommendationScore) {
          return right.recommendationScore - left.recommendationScore;
        }

        return right.avgRating - left.avgRating;
      });

    const args = getPaginationArgs(pagination);

    return {
      data: recommended.slice(args.skip, args.skip + args.take),
      pagination: buildPagination(pagination.page, pagination.limit, recommended.length)
    };
  }

  async getRecentPosts(pagination: PaginationInput) {
    const args = getPaginationArgs(pagination);
    const [posts, total] = await Promise.all([this.repository.getRecentPosts(args.skip, args.take), this.repository.countRecentPosts()]);

    return {
      data: posts.map((post: any) => ({
        id: post.id,
        body: post.body,
        visibility: post.visibility,
        createdAt: post.createdAt,
        author: {
          userId: post.authorUser.id,
          displayName:
            post.authorUser.profile?.displayName ??
            ([post.authorUser.profile?.firstName, post.authorUser.profile?.lastName].filter(Boolean).join(" ").trim() || null),
          avatarUrl: post.authorUser.profile?.avatarUrl ?? null
        },
        media: post.media.map((item: any) => ({
          id: item.id,
          mediaUrl: item.mediaUrl,
          mediaType: item.mediaType,
          sortOrder: item.sortOrder
        })),
        commentCount: post._count.comments,
        likeCount: post._count.likes
      })),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async refreshSearchIndex(workerProfileId: string): Promise<void> {
    await this.indexer.indexWorker(workerProfileId);
  }

  async removeWorkerFromSearch(workerProfileId: string): Promise<void> {
    await this.indexer.removeWorkerFromIndex(workerProfileId);
  }

  async removeWorkerByUserId(userId: string): Promise<void> {
    await this.indexer.removeWorkerByUserId(userId);
  }
}

export { SearchService };
