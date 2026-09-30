import { ApiError } from "../../lib/errors";
import type { ActorContext } from "../../types/actor";
import { SkillsRepository } from "./skills.repository";

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export class SkillsService {
  constructor(private readonly repository: SkillsRepository = new SkillsRepository()) {}

  async listSkills(params: { category?: string; query?: string; page: number; limit: number }) {
    return this.repository.listSkills(params);
  }

  async createSkill(data: { name: string; category: string; isVerified?: boolean }) {
    const slug = slugify(data.name);
    const existing = await this.repository.findSkillByName(data.name);
    if (existing) {
      return existing;
    }
    return this.repository.createSkill({ ...data, slug });
  }

  async updateSkill(id: string, data: any) {
    if (data.name) {
      data.slug = slugify(data.name);
    }
    return this.repository.updateSkill(id, data);
  }

  async deleteSkill(id: string) {
    return this.repository.deleteSkill(id);
  }

  async getUserSkills(userId: string) {
    return this.repository.getUserSkills(userId);
  }

  async addUserSkill(actor: ActorContext, skillId: string) {
    const existing = await this.repository.findUserSkill(actor.userId, skillId);
    if (existing) {
      return existing;
    }
    return this.repository.addUserSkill(actor.userId, skillId);
  }

  async removeUserSkill(actor: ActorContext, skillId: string) {
    return this.repository.removeUserSkill(actor.userId, skillId);
  }

  async endorseSkill(actor: ActorContext, targetUserId: string, skillId: string) {
    if (actor.userId === targetUserId) {
      throw new ApiError("BAD_REQUEST", 400, "You cannot endorse your own skills");
    }

    const userSkill = await this.repository.findUserSkill(targetUserId, skillId);
    if (!userSkill) {
      throw new ApiError("NOT_FOUND", 404, "User does not have this skill listed");
    }

    try {
      return await this.repository.endorseSkill(userSkill.id, actor.userId);
    } catch {
      // Already endorsed
      return { alreadyEndorsed: true };
    }
  }

  async removeEndorsement(actor: ActorContext, targetUserId: string, skillId: string) {
    const userSkill = await this.repository.findUserSkill(targetUserId, skillId);
    if (!userSkill) {
      throw new ApiError("NOT_FOUND", 404, "User skill not found");
    }
    return this.repository.removeEndorsement(userSkill.id, actor.userId);
  }
}
