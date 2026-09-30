import type { ArticleStatus, PostReactionType } from "@prisma/client";
import { ApiError } from "../../lib/errors";
import type { ActorContext } from "../../types/actor";
import { ArticlesRepository } from "./articles.repository";

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") +
  "-" +
  Math.random().toString(36).substring(2, 7);

export class ArticlesService {
  constructor(private readonly repository: ArticlesRepository = new ArticlesRepository()) {}

  async listArticles(params: { authorUserId?: string; status?: ArticleStatus; page: number; limit: number }) {
    return this.repository.listArticles(params);
  }

  async getArticle(idOrSlug: string) {
    const article = await this.repository.findByIdOrSlug(idOrSlug);
    if (!article) {
      throw new ApiError("NOT_FOUND", 404, "Article not found");
    }
    // Asynchronously bump view count
    this.repository.incrementViews(article.id).catch(() => {});
    return article;
  }

  async createArticle(
    actor: ActorContext,
    data: {
      title: string;
      body: string;
      coverImageUrl?: string | null;
      readingTimeMinutes?: number;
      status?: ArticleStatus;
    }
  ) {
    const slug = slugify(data.title);
    const publishedAt = data.status === "PUBLISHED" ? new Date() : null;

    return this.repository.create({
      authorUserId: actor.userId,
      title: data.title,
      slug,
      body: data.body,
      coverImageUrl: data.coverImageUrl,
      readingTimeMinutes: data.readingTimeMinutes ?? 3,
      status: data.status ?? "PUBLISHED",
      publishedAt
    });
  }

  async updateArticle(actor: ActorContext, id: string, data: any) {
    const updateData = { ...data };
    if (data.status === "PUBLISHED" && !data.publishedAt) {
      updateData.publishedAt = new Date();
    }
    return this.repository.update(id, actor.userId, updateData);
  }

  async deleteArticle(actor: ActorContext, id: string) {
    return this.repository.delete(id, actor.userId);
  }

  async reactToArticle(actor: ActorContext, id: string, reactionType: PostReactionType) {
    return this.repository.upsertReaction(id, actor.userId, reactionType);
  }

  async removeReaction(actor: ActorContext, id: string) {
    return this.repository.removeReaction(id, actor.userId);
  }

  async createComment(actor: ActorContext, id: string, body: string, parentCommentId?: string | null) {
    return this.repository.createComment(id, actor.userId, body, parentCommentId);
  }

  async listComments(id: string) {
    return this.repository.listComments(id);
  }
}
