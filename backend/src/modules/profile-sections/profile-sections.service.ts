import { ProfileSectionsRepository } from "./profile-sections.repository";
import type { ActorContext } from "../../types/actor";

export class ProfileSectionsService {
  constructor(private readonly repository: ProfileSectionsRepository = new ProfileSectionsRepository()) {}

  async getUserSections(userId: string) {
    return this.repository.getUserSections(userId);
  }

  async createExperience(actor: ActorContext, data: any) {
    return this.repository.createExperience(actor.userId, {
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null
    });
  }

  async updateExperience(actor: ActorContext, id: string, data: any) {
    const updateData = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    return this.repository.updateExperience(id, actor.userId, updateData);
  }

  async deleteExperience(actor: ActorContext, id: string) {
    return this.repository.deleteExperience(id, actor.userId);
  }

  async createEducation(actor: ActorContext, data: any) {
    return this.repository.createEducation(actor.userId, {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null
    });
  }

  async updateEducation(actor: ActorContext, id: string, data: any) {
    const updateData = { ...data };
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    return this.repository.updateEducation(id, actor.userId, updateData);
  }

  async deleteEducation(actor: ActorContext, id: string) {
    return this.repository.deleteEducation(id, actor.userId);
  }

  async createAccomplishment(actor: ActorContext, data: any) {
    return this.repository.createAccomplishment(actor.userId, {
      ...data,
      issueDate: data.issueDate ? new Date(data.issueDate) : null,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null
    });
  }

  async updateAccomplishment(actor: ActorContext, id: string, data: any) {
    const updateData = { ...data };
    if (data.issueDate !== undefined) updateData.issueDate = data.issueDate ? new Date(data.issueDate) : null;
    if (data.expirationDate !== undefined) updateData.expirationDate = data.expirationDate ? new Date(data.expirationDate) : null;
    return this.repository.updateAccomplishment(id, actor.userId, updateData);
  }

  async deleteAccomplishment(actor: ActorContext, id: string) {
    return this.repository.deleteAccomplishment(id, actor.userId);
  }

  async createVolunteer(actor: ActorContext, data: any) {
    return this.repository.createVolunteer(actor.userId, {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null
    });
  }

  async updateVolunteer(actor: ActorContext, id: string, data: any) {
    const updateData = { ...data };
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    return this.repository.updateVolunteer(id, actor.userId, updateData);
  }

  async deleteVolunteer(actor: ActorContext, id: string) {
    return this.repository.deleteVolunteer(id, actor.userId);
  }

  async createFeaturedItem(actor: ActorContext, data: any) {
    return this.repository.createFeaturedItem(actor.userId, data);
  }

  async updateFeaturedItem(actor: ActorContext, id: string, data: any) {
    return this.repository.updateFeaturedItem(id, actor.userId, data);
  }

  async deleteFeaturedItem(actor: ActorContext, id: string) {
    return this.repository.deleteFeaturedItem(id, actor.userId);
  }

  async updateOpenToWork(actor: ActorContext, data: { openToWork: boolean; openToWorkTitle?: string | null; openToHire?: boolean }) {
    return this.repository.updateOpenToWork(actor.userId, data);
  }

  async recordProfileView(viewedUserId: string, viewerUserId?: string) {
    return this.repository.recordProfileView(viewedUserId, viewerUserId);
  }

  async getProfileViews(actor: ActorContext) {
    return this.repository.getProfileViews(actor.userId);
  }
}
