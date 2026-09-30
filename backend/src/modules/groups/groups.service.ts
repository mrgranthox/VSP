import { ApiError } from "../../lib/errors";
import type { ActorContext } from "../../types/actor";
import { GroupsRepository } from "./groups.repository";

export class GroupsService {
  constructor(private readonly repository: GroupsRepository = new GroupsRepository()) {}

  async listGroups(params: { query?: string; page: number; limit: number }) {
    return this.repository.listGroups(params);
  }

  async getGroup(id: string) {
    const group = await this.repository.findById(id);
    if (!group) {
      throw new ApiError("NOT_FOUND", 404, "Group not found");
    }
    return group;
  }

  async createGroup(actor: ActorContext, data: any) {
    return this.repository.create({
      ...data,
      creatorUserId: actor.userId
    });
  }

  async updateGroup(actor: ActorContext, id: string, data: any) {
    return this.repository.update(id, actor.userId, data);
  }

  async deleteGroup(actor: ActorContext, id: string) {
    return this.repository.delete(id, actor.userId);
  }

  async joinGroup(actor: ActorContext, id: string) {
    return this.repository.joinGroup(id, actor.userId);
  }

  async leaveGroup(actor: ActorContext, id: string) {
    return this.repository.leaveGroup(id, actor.userId);
  }

  async getGroupPosts(id: string, page = 1, limit = 20) {
    return this.repository.getGroupPosts(id, page, limit);
  }
}
