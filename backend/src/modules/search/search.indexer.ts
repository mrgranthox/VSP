import { VerificationStatus } from "@prisma/client";

import { logger } from "../../lib/logger";
import { redis } from "../../lib/redis";
import { isTypesenseConfigured, typesenseClient, typesenseWorkersCollection } from "../../lib/typesense";
import { SearchRepository } from "./search.repository";

const SEARCH_NEARBY_VERSION_KEY = "search:nearby:version";

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

const getPrimaryLocation = (worker: any): { lat: number; lng: number } | null => {
  const serviceArea = worker.serviceAreas.find((item: any) => decimalToNumber(item.centerLat) !== null && decimalToNumber(item.centerLng) !== null);

  if (serviceArea) {
    return {
      lat: decimalToNumber(serviceArea.centerLat)!,
      lng: decimalToNumber(serviceArea.centerLng)!
    };
  }

  const profileLat = decimalToNumber(worker.user?.profile?.lat);
  const profileLng = decimalToNumber(worker.user?.profile?.lng);

  if (profileLat === null || profileLng === null) {
    return null;
  }

  return {
    lat: profileLat,
    lng: profileLng
  };
};

const computeProfileCompleteScore = (worker: any): number => {
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

  if ((worker.certifications ?? []).some((item: any) => item.verificationStatus === VerificationStatus.APPROVED)) {
    score += 10;
  }

  if ((worker.availabilityRules ?? []).length >= 2) {
    score += 10;
  }

  if ((worker.experienceYears ?? 0) > 0) {
    score += 5;
  }

  return score;
};

class SearchIndexer {
  constructor(private readonly repository: SearchRepository = new SearchRepository()) {}

  async bumpNearbyCacheVersion(): Promise<void> {
    await redis.incr(SEARCH_NEARBY_VERSION_KEY);
  }

  private buildDocument(worker: any) {
    const primaryLocation = getPrimaryLocation(worker);
    const primaryCity = worker.serviceAreas.find((item: any) => item.city)?.city ?? worker.user?.profile?.city ?? null;

    return {
      id: worker.id,
      headline: worker.headline ?? "",
      bio: worker.bio ?? "",
      trade_slugs: worker.tradeCategories.map((item: any) => item.tradeCategory.slug),
      city_slug: primaryCity?.slug ?? "",
      country_code: primaryCity?.countryCode ?? "",
      avg_rating: decimalToNumber(worker.avgRating) ?? 0,
      total_reviews: worker.totalReviews ?? 0,
      jobs_completed: worker.jobsCompleted ?? 0,
      response_rate: decimalToNumber(worker.responseRate) ?? 0,
      is_featured: worker.isFeatured ?? false,
      verification_status: worker.verificationStatus,
      location: primaryLocation ? [primaryLocation.lat, primaryLocation.lng] : [0, 0],
      embedding: [],
      profile_complete_score: computeProfileCompleteScore(worker),
      last_active_at: new Date(worker.user?.lastLoginAt ?? worker.updatedAt).getTime()
    };
  }

  async indexWorker(workerProfileId: string): Promise<void> {
    await this.bumpNearbyCacheVersion();

    if (!isTypesenseConfigured || !typesenseClient) {
      return;
    }

    const worker = await this.repository.getWorkerCandidateById(workerProfileId);

    if (!worker || worker.verificationStatus !== VerificationStatus.APPROVED || worker.user?.status !== "ACTIVE") {
      await this.removeWorkerFromIndex(workerProfileId);
      return;
    }

    try {
      await typesenseClient.collections(typesenseWorkersCollection).documents().upsert(this.buildDocument(worker));
    } catch (error) {
      logger.warn({ err: error, workerProfileId }, "Failed to index worker in Typesense");
    }
  }

  async removeWorkerFromIndex(workerProfileId: string): Promise<void> {
    await this.bumpNearbyCacheVersion();

    if (!isTypesenseConfigured || !typesenseClient) {
      return;
    }

    try {
      await typesenseClient.collections(typesenseWorkersCollection).documents(workerProfileId).delete();
    } catch (error) {
      logger.warn({ err: error, workerProfileId }, "Failed to remove worker from Typesense");
    }
  }

  async removeWorkerByUserId(userId: string): Promise<void> {
    const workerProfile = await this.repository.findWorkerProfileByUserId(userId);

    if (!workerProfile) {
      return;
    }

    await this.removeWorkerFromIndex(workerProfile.id);
  }
}

export { SEARCH_NEARBY_VERSION_KEY, SearchIndexer };
