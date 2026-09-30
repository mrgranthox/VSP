import { ApiError } from "../../lib/errors";
import type { ActorContext } from "../../types/actor";
import { CompanyPagesRepository } from "./company-pages.repository";

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export class CompanyPagesService {
  constructor(private readonly repository: CompanyPagesRepository = new CompanyPagesRepository()) {}

  async listCompanies(params: { industry?: string; query?: string; page: number; limit: number }) {
    return this.repository.listCompanies(params);
  }

  async getCompany(idOrSlug: string) {
    const comp = await this.repository.findByIdOrSlug(idOrSlug);
    if (!comp) {
      throw new ApiError("NOT_FOUND", 404, "Company page not found");
    }
    return comp;
  }

  async createCompany(actor: ActorContext, data: any) {
    let slug = slugify(data.name);
    // ensure unique slug
    const existing = await this.repository.findByIdOrSlug(slug);
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    return this.repository.create({
      ...data,
      slug,
      adminUserId: actor.userId
    });
  }

  async updateCompany(actor: ActorContext, id: string, data: any) {
    return this.repository.update(id, actor.userId, data);
  }

  async deleteCompany(actor: ActorContext, id: string) {
    return this.repository.delete(id, actor.userId);
  }

  async followCompany(actor: ActorContext, companyId: string) {
    return this.repository.follow(companyId, actor.userId);
  }

  async unfollowCompany(actor: ActorContext, companyId: string) {
    return this.repository.unfollow(companyId, actor.userId);
  }
}
