import { MediaCategory, Prisma, VerificationStatus } from "@prisma/client";

import { EventBus } from "../../lib/eventBus";
import { ApiError, Errors } from "../../lib/errors";
import { normalizePrivateMediaRef, resolveMediaUrl } from "../../lib/media";
import type { ActorContext } from "../../types/actor";
import { MediaService } from "../media/media.service";
import { WorkerProfilesRepository, type WorkerProfileDetail } from "./worker-profiles.repository";

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, "").trim();

const parseDateOnly = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
};

const notFoundError = () => new ApiError("NOT_FOUND", 404, "Record not found");

const mapPublicWorkerProfile = (workerProfile: WorkerProfileDetail) => ({
  id: workerProfile.id,
  headline: workerProfile.headline,
  bio: workerProfile.bio,
  experienceYears: workerProfile.experienceYears,
  verificationStatus: workerProfile.verificationStatus,
  avgRating: workerProfile.avgRating,
  totalReviews: workerProfile.totalReviews,
  jobsCompleted: workerProfile.jobsCompleted,
  responseRate: workerProfile.responseRate,
  isFeatured: workerProfile.isFeatured,
  serviceRadiusKm: workerProfile.serviceRadiusKm,
  tradeCategories: workerProfile.tradeCategories.map((item: any) => item.tradeCategory),
  services: workerProfile.services
    .filter((service: any) => service.isEnabled)
    .map((service: any) => ({
      id: service.id,
      title: service.title,
      description: service.description,
      basePriceMinor: service.basePriceMinor,
      currencyCode: service.currencyCode,
      isEnabled: service.isEnabled,
      createdAt: service.createdAt
    })),
  serviceAreas: workerProfile.serviceAreas.map((area: any) => ({
    id: area.id,
    cityId: area.cityId,
    centerLat: area.centerLat,
    centerLng: area.centerLng,
    radiusKm: area.radiusKm,
    coverageMode: area.coverageMode,
    createdAt: area.createdAt,
    city: area.city
  })),
  portfolioItems: workerProfile.portfolioItems.map((item: any) => ({
    id: item.id,
    title: item.title,
    caption: item.caption,
    mediaUrl: item.mediaUrl,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt
  })),
  certifications: workerProfile.certifications.map((certification: any) => ({
    title: certification.title,
    issuer: certification.issuer,
    verificationStatus: certification.verificationStatus
  }))
});

class WorkerProfilesService {
  constructor(
    private readonly repository: WorkerProfilesRepository = new WorkerProfilesRepository(),
    private readonly mediaService: MediaService = new MediaService()
  ) {}

  private async emitWorkerProfileUpdated(workerProfileId: string): Promise<void> {
    await EventBus.emit("WORKER_PROFILE_UPDATED", {
      workerProfileId
    });
  }

  private async getExistingWorkerProfile(actor: ActorContext): Promise<WorkerProfileDetail> {
    const workerProfile = await this.repository.getWorkerProfileByUserId(actor.userId);

    if (!workerProfile) {
      throw Errors.WORKER_PROFILE_NOT_FOUND();
    }

    return workerProfile;
  }

  async recalculateAggregates(workerProfileId: string): Promise<void> {
    await this.repository.recalculateAggregates(workerProfileId);
    await this.emitWorkerProfileUpdated(workerProfileId);
  }

  private buildWorkerProfileUpdate(
    data: Partial<{
      headline: string;
      bio: string | null;
      experienceYears: number;
      serviceRadiusKm: number;
    }>
  ): Prisma.WorkerProfileUncheckedUpdateInput {
    const updateData: Prisma.WorkerProfileUncheckedUpdateInput = {};

    if (data.headline !== undefined) {
      updateData.headline = stripHtml(data.headline);
    }

    if (typeof data.bio === "string") {
      updateData.bio = stripHtml(data.bio);
    } else if (data.bio === null) {
      updateData.bio = null;
    }

    if (data.experienceYears !== undefined) {
      updateData.experienceYears = data.experienceYears;
    }

    if (data.serviceRadiusKm !== undefined) {
      updateData.serviceRadiusKm = data.serviceRadiusKm;
    }

    return updateData;
  }

  async createWorkerProfile(
    actor: ActorContext,
    data: {
      headline?: string;
      bio?: string;
      experienceYears: number;
    }
  ): Promise<WorkerProfileDetail> {
    const workerProfile = await this.repository.createWorkerProfile(actor.userId, {
      headline: data.headline ? stripHtml(data.headline) : undefined,
      bio: data.bio ? stripHtml(data.bio) : undefined,
      experienceYears: data.experienceYears
    });

    await EventBus.emit("WORKER_PROFILE_CREATED", {
      workerProfileId: workerProfile.id,
      userId: actor.userId
    });

    return workerProfile;
  }

  async getMyWorkerProfile(actor: ActorContext): Promise<WorkerProfileDetail> {
    return this.getExistingWorkerProfile(actor);
  }

  async updateMyWorkerProfile(
    actor: ActorContext,
    data: Partial<{
      headline: string;
      bio: string | null;
      experienceYears: number;
      serviceRadiusKm: number;
    }>
  ): Promise<WorkerProfileDetail> {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const updateData = this.buildWorkerProfileUpdate(data);
    const updatedWorkerProfile = await this.repository.updateWorkerProfile(workerProfile.id, updateData);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return updatedWorkerProfile;
  }

  async getPublicWorkerProfile(workerProfileId: string) {
    const workerProfile = await this.repository.getWorkerProfileById(workerProfileId);

    if (!workerProfile) {
      throw Errors.WORKER_PROFILE_NOT_FOUND();
    }

    return mapPublicWorkerProfile(workerProfile);
  }

  async addTradeCategory(actor: ActorContext, tradeCategoryId: string) {
    const workerProfile = await this.getExistingWorkerProfile(actor);

    if (!(await this.repository.tradeCategoryExists(tradeCategoryId))) {
      throw Errors.VALIDATION_FAILED({ tradeId: ["Trade category is not supported"] });
    }

    const result = await this.repository.addTradeCategory(workerProfile.id, tradeCategoryId);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return result;
  }

  async removeTradeCategory(actor: ActorContext, tradeCategoryId: string): Promise<void> {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    await this.repository.removeTradeCategory(workerProfile.id, tradeCategoryId);
    await this.emitWorkerProfileUpdated(workerProfile.id);
  }

  async createService(
    actor: ActorContext,
    data: {
      title: string;
      description?: string | null;
      basePriceMinor?: number | null;
      currencyCode?: string | null;
      isEnabled?: boolean;
    }
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const service = await this.repository.createService(workerProfile.id, {
      title: stripHtml(data.title),
      description: typeof data.description === "string" ? stripHtml(data.description) : data.description,
      basePriceMinor: data.basePriceMinor ?? null,
      currencyCode: data.currencyCode?.toUpperCase() ?? null,
      isEnabled: data.isEnabled ?? true
    });
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return service;
  }

  async updateService(
    actor: ActorContext,
    serviceId: string,
    data: Partial<{
      title: string;
      description: string | null;
      basePriceMinor: number | null;
      currencyCode: string | null;
      isEnabled: boolean;
    }>
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const service = await this.repository.getService(workerProfile.id, serviceId);

    if (!service) {
      throw notFoundError();
    }

    const updateData: Prisma.WorkerServiceUncheckedUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = stripHtml(data.title);
    }

    if (typeof data.description === "string") {
      updateData.description = stripHtml(data.description);
    } else if (data.description === null) {
      updateData.description = null;
    }

    if (data.basePriceMinor !== undefined) {
      updateData.basePriceMinor = data.basePriceMinor;
    }

    if (data.currencyCode !== undefined) {
      updateData.currencyCode = data.currencyCode ? data.currencyCode.toUpperCase() : null;
    }

    if (data.isEnabled !== undefined) {
      updateData.isEnabled = data.isEnabled;
    }

    const updatedService = await this.repository.updateService(service.id, updateData);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return updatedService;
  }

  async deleteService(actor: ActorContext, serviceId: string): Promise<void> {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const service = await this.repository.getService(workerProfile.id, serviceId);

    if (!service) {
      throw notFoundError();
    }

    await this.repository.deleteService(service.id);
    await this.emitWorkerProfileUpdated(workerProfile.id);
  }

  private async validateServiceAreaInput(
    workerProfileId: string,
    data: {
      cityId?: string | null;
      centerLat?: number | null;
      centerLng?: number | null;
      radiusKm?: number;
      coverageMode?: string;
    },
    areaId?: string
  ) {
    const existingArea = areaId ? await this.repository.getServiceArea(workerProfileId, areaId) : null;

    if (areaId && !existingArea) {
      throw notFoundError();
    }

    const cityId = data.cityId !== undefined ? data.cityId : existingArea?.cityId ?? null;
    const centerLat = data.centerLat !== undefined ? data.centerLat : existingArea?.centerLat?.toNumber() ?? null;
    const centerLng = data.centerLng !== undefined ? data.centerLng : existingArea?.centerLng?.toNumber() ?? null;

    if (cityId && !(await this.repository.cityExists(cityId))) {
      throw Errors.CITY_NOT_SUPPORTED();
    }

    if (!cityId && (centerLat === null || centerLng === null)) {
      throw Errors.VALIDATION_FAILED({
        serviceArea: ["cityId or centerLat+centerLng required"]
      });
    }

    const updateData: Prisma.WorkerServiceAreaUncheckedCreateInput | Prisma.WorkerServiceAreaUncheckedUpdateInput = {
      radiusKm: data.radiusKm ?? existingArea?.radiusKm ?? 10,
      coverageMode: data.coverageMode ?? existingArea?.coverageMode ?? "CIRCLE",
      cityId,
      centerLat: centerLat === null ? null : new Prisma.Decimal(centerLat),
      centerLng: centerLng === null ? null : new Prisma.Decimal(centerLng)
    };

    return {
      area: existingArea,
      updateData
    };
  }

  async createServiceArea(
    actor: ActorContext,
    data: {
      cityId?: string;
      centerLat?: number;
      centerLng?: number;
      radiusKm: number;
      coverageMode?: string;
    }
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const { updateData } = await this.validateServiceAreaInput(workerProfile.id, data);
    const serviceArea = await this.repository.createServiceArea(workerProfile.id, updateData as Prisma.WorkerServiceAreaUncheckedCreateInput);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return serviceArea;
  }

  async updateServiceArea(
    actor: ActorContext,
    areaId: string,
    data: Partial<{
      cityId: string | null;
      centerLat: number | null;
      centerLng: number | null;
      radiusKm: number;
      coverageMode: string;
    }>
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const { area, updateData } = await this.validateServiceAreaInput(workerProfile.id, data, areaId);

    const updatedServiceArea = await this.repository.updateServiceArea(area!.id, updateData as Prisma.WorkerServiceAreaUncheckedUpdateInput);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return updatedServiceArea;
  }

  async deleteServiceArea(actor: ActorContext, areaId: string): Promise<void> {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const area = await this.repository.getServiceArea(workerProfile.id, areaId);

    if (!area) {
      throw notFoundError();
    }

    await this.repository.deleteServiceArea(area.id);
    await this.emitWorkerProfileUpdated(workerProfile.id);
  }

  private validateAvailabilityWindow(startMinute: number, endMinute: number): void {
    if (startMinute >= endMinute) {
      throw Errors.VALIDATION_FAILED({
        availability: ["startMinute must be before endMinute"]
      });
    }
  }

  async createAvailabilityRule(
    actor: ActorContext,
    data: {
      dayOfWeek: number;
      startMinute: number;
      endMinute: number;
      timezone: string;
    }
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    this.validateAvailabilityWindow(data.startMinute, data.endMinute);
    const rule = await this.repository.createAvailabilityRule(workerProfile.id, data);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return rule;
  }

  async updateAvailabilityRule(
    actor: ActorContext,
    ruleId: string,
    data: Partial<{
      dayOfWeek: number;
      startMinute: number;
      endMinute: number;
      timezone: string;
    }>
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const rule = await this.repository.getAvailabilityRule(workerProfile.id, ruleId);

    if (!rule) {
      throw notFoundError();
    }

    const startMinute = data.startMinute ?? rule.startMinute;
    const endMinute = data.endMinute ?? rule.endMinute;
    this.validateAvailabilityWindow(startMinute, endMinute);

    const updatedRule = await this.repository.updateAvailabilityRule(rule.id, data);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return updatedRule;
  }

  async deleteAvailabilityRule(actor: ActorContext, ruleId: string): Promise<void> {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const rule = await this.repository.getAvailabilityRule(workerProfile.id, ruleId);

    if (!rule) {
      throw notFoundError();
    }

    await this.repository.deleteAvailabilityRule(rule.id);
    await this.emitWorkerProfileUpdated(workerProfile.id);
  }

  private validateExceptionWindow(startsAt: Date, endsAt: Date): void {
    if (startsAt >= endsAt) {
      throw Errors.VALIDATION_FAILED({
        availabilityException: ["startsAt must be before endsAt"]
      });
    }
  }

  async createAvailabilityException(
    actor: ActorContext,
    data: {
      startsAt: Date;
      endsAt: Date;
      reason?: string | null;
    }
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    this.validateExceptionWindow(data.startsAt, data.endsAt);
    const exception = await this.repository.createAvailabilityException(workerProfile.id, {
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      reason: typeof data.reason === "string" ? stripHtml(data.reason) : data.reason ?? null
    });
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return exception;
  }

  async updateAvailabilityException(
    actor: ActorContext,
    exceptionId: string,
    data: Partial<{
      startsAt: Date;
      endsAt: Date;
      reason: string | null;
    }>
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const exception = await this.repository.getAvailabilityException(workerProfile.id, exceptionId);

    if (!exception) {
      throw notFoundError();
    }

    const startsAt = data.startsAt ?? exception.startsAt;
    const endsAt = data.endsAt ?? exception.endsAt;
    this.validateExceptionWindow(startsAt, endsAt);

    const updateData: Prisma.WorkerAvailabilityExceptionUncheckedUpdateInput = {};

    if (data.startsAt !== undefined) {
      updateData.startsAt = data.startsAt;
    }

    if (data.endsAt !== undefined) {
      updateData.endsAt = data.endsAt;
    }

    if (typeof data.reason === "string") {
      updateData.reason = stripHtml(data.reason);
    } else if (data.reason === null) {
      updateData.reason = null;
    }

    const updatedException = await this.repository.updateAvailabilityException(exception.id, updateData);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return updatedException;
  }

  async deleteAvailabilityException(actor: ActorContext, exceptionId: string): Promise<void> {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const exception = await this.repository.getAvailabilityException(workerProfile.id, exceptionId);

    if (!exception) {
      throw notFoundError();
    }

    await this.repository.deleteAvailabilityException(exception.id);
    await this.emitWorkerProfileUpdated(workerProfile.id);
  }

  async createPortfolioItem(
    actor: ActorContext,
    data: {
      title?: string | null;
      caption?: string | null;
      mediaRef: string;
      sortOrder: number;
    }
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const resolvedMedia = await this.mediaService.resolvePublicMediaInput(actor, data.mediaRef, [
      MediaCategory.portfolio_image,
      MediaCategory.portfolio_video
    ]);
    const portfolioItem = await this.repository.createPortfolioItem(workerProfile.id, {
      mediaAssetId: resolvedMedia.mediaAssetId ?? null,
      title: typeof data.title === "string" ? stripHtml(data.title) : data.title ?? null,
      caption: typeof data.caption === "string" ? stripHtml(data.caption) : data.caption ?? null,
      mediaUrl: resolvedMedia.mediaUrl,
      sortOrder: data.sortOrder
    });
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return portfolioItem;
  }

  async updatePortfolioItem(
    actor: ActorContext,
    itemId: string,
    data: Partial<{
      title: string | null;
      caption: string | null;
      mediaRef: string;
      sortOrder: number;
    }>
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const item = await this.repository.getPortfolioItem(workerProfile.id, itemId);

    if (!item) {
      throw notFoundError();
    }

    const updateData: Prisma.WorkerPortfolioItemUncheckedUpdateInput = {};

    if (typeof data.title === "string") {
      updateData.title = stripHtml(data.title);
    } else if (data.title === null) {
      updateData.title = null;
    }

    if (typeof data.caption === "string") {
      updateData.caption = stripHtml(data.caption);
    } else if (data.caption === null) {
      updateData.caption = null;
    }

    if (data.mediaRef !== undefined) {
      const resolvedMedia = await this.mediaService.resolvePublicMediaInput(actor, data.mediaRef, [
        MediaCategory.portfolio_image,
        MediaCategory.portfolio_video
      ]);
      updateData.mediaAssetId = resolvedMedia.mediaAssetId ?? null;
      updateData.mediaUrl = resolvedMedia.mediaUrl;
    }

    if (data.sortOrder !== undefined) {
      updateData.sortOrder = data.sortOrder;
    }

    const updatedPortfolioItem = await this.repository.updatePortfolioItem(item.id, updateData);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return updatedPortfolioItem;
  }

  async deletePortfolioItem(actor: ActorContext, itemId: string): Promise<void> {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const item = await this.repository.getPortfolioItem(workerProfile.id, itemId);

    if (!item) {
      throw notFoundError();
    }

    await this.repository.deletePortfolioItem(item.id);
    await this.emitWorkerProfileUpdated(workerProfile.id);
  }

  async createCertification(
    actor: ActorContext,
    data: {
      title: string;
      issuer?: string | null;
      mediaRef: string;
      issuedOn?: string;
      expiresOn?: string | null;
    }
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const resolvedMedia = await this.mediaService.resolvePrivateMediaInput(actor, data.mediaRef, [MediaCategory.certification]);
    const certification = await this.repository.createCertification(workerProfile.id, {
      mediaAssetId: resolvedMedia.mediaAssetId ?? null,
      title: stripHtml(data.title),
      issuer: typeof data.issuer === "string" ? stripHtml(data.issuer) : data.issuer ?? null,
      certificateUrl: resolvedMedia.fileUrl,
      issuedOn: parseDateOnly(data.issuedOn),
      expiresOn: parseDateOnly(data.expiresOn)
    });
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return certification;
  }

  async updateCertification(
    actor: ActorContext,
    certId: string,
    data: Partial<{
      title: string;
      issuer: string | null;
      mediaRef: string;
      issuedOn: string | null;
      expiresOn: string | null;
    }>
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const certification = await this.repository.getCertification(workerProfile.id, certId);

    if (!certification) {
      throw notFoundError();
    }

    const updateData: Prisma.WorkerCertificationUncheckedUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = stripHtml(data.title);
    }

    if (typeof data.issuer === "string") {
      updateData.issuer = stripHtml(data.issuer);
    } else if (data.issuer === null) {
      updateData.issuer = null;
    }

    if (data.mediaRef !== undefined) {
      const resolvedMedia = await this.mediaService.resolvePrivateMediaInput(actor, data.mediaRef, [MediaCategory.certification]);
      updateData.mediaAssetId = resolvedMedia.mediaAssetId ?? null;
      updateData.certificateUrl = resolvedMedia.fileUrl;
    }

    if (data.issuedOn !== undefined) {
      updateData.issuedOn = parseDateOnly(data.issuedOn);
    }

    if (data.expiresOn !== undefined) {
      updateData.expiresOn = parseDateOnly(data.expiresOn);
    }

    const updatedCertification = await this.repository.updateCertification(certification.id, updateData);
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return updatedCertification;
  }

  async deleteCertification(actor: ActorContext, certId: string): Promise<void> {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const certification = await this.repository.getCertification(workerProfile.id, certId);

    if (!certification) {
      throw notFoundError();
    }

    await this.repository.deleteCertification(certification.id);
    await this.emitWorkerProfileUpdated(workerProfile.id);
  }

  async submitVerificationRequest(
    actor: ActorContext,
    data: {
      documentRefs: string[];
      notes?: string;
    }
  ) {
    const workerProfile = await this.getExistingWorkerProfile(actor);
    const resolvedDocumentRefs = await this.mediaService.resolveVerificationDocumentRefs(actor, data.documentRefs, [
      MediaCategory.verification_doc
    ]);

    if (![VerificationStatus.DRAFT, VerificationStatus.REJECTED, VerificationStatus.EXPIRED].includes(workerProfile.verificationStatus)) {
      throw Errors.VALIDATION_FAILED({
        verificationStatus: [`Cannot submit verification from status ${workerProfile.verificationStatus}`]
      });
    }

    const result = await this.repository.submitVerificationRequest(workerProfile.id, data.notes ? stripHtml(data.notes) : undefined);

    await EventBus.emit("WORKER_VERIFICATION_SUBMITTED", {
      workerProfileId: workerProfile.id,
      verificationRequestId: result.verificationRequestId,
      documentRefs: resolvedDocumentRefs,
      notes: data.notes
    });
    await this.emitWorkerProfileUpdated(workerProfile.id);

    return result.workerProfile;
  }
}

export { WorkerProfilesService };
