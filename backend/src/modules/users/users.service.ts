import { Prisma, type FollowTargetType } from "@prisma/client";

import { EventBus } from "../../lib/eventBus";
import { Errors } from "../../lib/errors";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import type { ActorContext } from "../../types/actor";
import { UsersRepository, type PublicUserProfile, type UserWithProfile } from "./users.repository";

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, "").trim();

interface MeResult {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  cityId: string | null;
  lat: Prisma.Decimal | null;
  lng: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
  user: UserWithProfile;
}

class UsersService {
  constructor(private readonly repository: UsersRepository = new UsersRepository()) {}

  private async getExistingUserWithProfile(userId: string): Promise<UserWithProfile> {
    const user = await this.repository.getUserWithProfile(userId);

    if (!user?.profile) {
      throw Errors.USER_NOT_FOUND();
    }

    return user;
  }

  async getMe(actor: ActorContext): Promise<MeResult> {
    const user = await this.getExistingUserWithProfile(actor.userId);

    return {
      ...user.profile!,
      user
    };
  }

  async updateMe(
    actor: ActorContext,
    data: Partial<{
      firstName: string;
      lastName: string;
      displayName: string | null;
      bio: string | null;
      cityId: string | null;
      lat: number | null;
      lng: number | null;
    }>
  ) {
    await this.getExistingUserWithProfile(actor.userId);

    if (data.cityId && !(await this.repository.cityExists(data.cityId))) {
      throw Errors.CITY_NOT_SUPPORTED();
    }

    const updateData: Parameters<UsersRepository["updateUserProfile"]>[1] = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName;
    }

    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName;
    }

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

    if (data.cityId !== undefined) {
      updateData.cityId = data.cityId;
    }

    if (typeof data.bio === "string") {
      updateData.bio = stripHtml(data.bio);
    } else if (data.bio === null) {
      updateData.bio = null;
    }

    if (data.lat !== undefined) {
      updateData.lat = data.lat === null ? null : new Prisma.Decimal(data.lat);
    }

    if (data.lng !== undefined) {
      updateData.lng = data.lng === null ? null : new Prisma.Decimal(data.lng);
    }

    return this.repository.updateUserProfile(actor.userId, updateData);
  }

  async getPublicProfile(userId: string): Promise<PublicUserProfile> {
    const profile = await this.repository.getPublicProfile(userId);

    if (!profile) {
      throw Errors.USER_NOT_FOUND();
    }

    return profile;
  }

  async deleteMe(actor: ActorContext): Promise<void> {
    await this.getExistingUserWithProfile(actor.userId);
    await this.repository.markUserDeleted(actor.userId);
    await EventBus.emit("USER_DELETION_REQUESTED", {
      userId: actor.userId,
      requestedAt: new Date().toISOString()
    });
  }

  async getNotificationPreferences(actor: ActorContext) {
    await this.getExistingUserWithProfile(actor.userId);
    return this.repository.ensureNotificationPreference(actor.userId);
  }

  async updateNotificationPreferences(
    actor: ActorContext,
    data: Partial<{
      chatPushEnabled: boolean;
      requestPushEnabled: boolean;
      marketingEmailEnabled: boolean;
      quietHoursStart: number | null;
      quietHoursEnd: number | null;
    }>
  ) {
    await this.getExistingUserWithProfile(actor.userId);
    return this.repository.updateNotificationPreference(actor.userId, data);
  }

  async getSavedWorkers(actor: ActorContext, pagination: PaginationInput) {
    await this.getExistingUserWithProfile(actor.userId);
    const args = getPaginationArgs(pagination);
    const [items, total] = await Promise.all([
      this.repository.getSavedWorkers(actor.userId, args.skip, args.take),
      this.repository.countSavedWorkers(actor.userId)
    ]);

    return {
      data: items.map((item) => item.workerProfile),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async saveWorker(actor: ActorContext, workerProfileId: string): Promise<void> {
    await this.getExistingUserWithProfile(actor.userId);
    const worker = await this.repository.getApprovedWorkerProfile(workerProfileId);

    if (!worker) {
      throw Errors.WORKER_NOT_VERIFIED();
    }

    await this.repository.saveWorker(actor.userId, workerProfileId);
  }

  async unsaveWorker(actor: ActorContext, workerProfileId: string): Promise<void> {
    await this.getExistingUserWithProfile(actor.userId);
    await this.repository.unsaveWorker(actor.userId, workerProfileId);
  }

  async getFollows(actor: ActorContext, pagination: PaginationInput) {
    await this.getExistingUserWithProfile(actor.userId);
    const args = getPaginationArgs(pagination);
    const [items, total] = await Promise.all([
      this.repository.getFollows(actor.userId, args.skip, args.take),
      this.repository.countFollows(actor.userId)
    ]);

    return {
      data: items.map((item) => ({
        targetType: item.targetType,
        targetId: item.targetId
      })),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async followTarget(actor: ActorContext, targetType: "USER" | "WORKER", targetId: string): Promise<void> {
    await this.getExistingUserWithProfile(actor.userId);

    if (targetType === "USER") {
      if (targetId === actor.userId) {
        throw Errors.PERMISSION_DENIED();
      }

      if (!(await this.repository.userExists(targetId))) {
        throw Errors.USER_NOT_FOUND();
      }
    } else if (!(await this.repository.getWorkerProfile(targetId))) {
      throw Errors.WORKER_PROFILE_NOT_FOUND();
    }

    await this.repository.followTarget(actor.userId, targetType as FollowTargetType, targetId);
  }

  async unfollowTarget(actor: ActorContext, targetType: "USER" | "WORKER", targetId: string): Promise<void> {
    await this.getExistingUserWithProfile(actor.userId);
    await this.repository.unfollowTarget(actor.userId, targetType as FollowTargetType, targetId);
  }
}

export { UsersService };
