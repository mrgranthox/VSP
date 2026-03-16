import { MediaCategory, type ModerationSeverity, type VisibilityScope } from "@prisma/client";

import { Errors } from "../../lib/errors";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import type { ActorContext } from "../../types/actor";
import { MediaService } from "../media/media.service";
import { ModerationService } from "../moderation/moderation.service";
import { SocialRepository } from "./social.repository";

const defaultFeedWeights = {
  recency: 0.5,
  engagement: 0.3,
  follow_relationship: 0.2
};

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const getDisplayName = (profile: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null | undefined): string | null =>
  profile?.displayName ?? ([profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || null);

class SocialService {
  constructor(
    private readonly repository: SocialRepository = new SocialRepository(),
    private readonly moderationService: ModerationService = new ModerationService(),
    private readonly mediaService: MediaService = new MediaService()
  ) {}

  private async getFeedWeights() {
    const config = await this.repository.getFeedRankingWeights();
    const weights = config?.valueJson;

    if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
      return defaultFeedWeights;
    }

    return {
      ...defaultFeedWeights,
      ...(weights as Record<string, number>)
    };
  }

  private getPostAuthorRelationship(post: any, directUserFollows: Set<string>, directWorkerFollows: Set<string>, secondDegreeUserFollows: Set<string>, actorCityId?: string | null): number {
    if (post.visibility === "PRIVATE") {
      return 0;
    }

    if (directUserFollows.has(post.authorUserId) || (post.authorUser.workerProfile?.id && directWorkerFollows.has(post.authorUser.workerProfile.id))) {
      return 1;
    }

    if (secondDegreeUserFollows.has(post.authorUserId)) {
      return 0.5;
    }

    if (actorCityId && post.visibility === "PUBLIC" && post.authorUser.profile?.cityId === actorCityId) {
      return 0.2;
    }

    return 0;
  }

  private canViewPost(post: any, actor?: ActorContext, directUserFollows?: Set<string>, directWorkerFollows?: Set<string>): boolean {
    if (post.isDeleted) {
      return false;
    }

    if (!actor) {
      return post.visibility === "PUBLIC";
    }

    if (post.authorUserId === actor.userId) {
      return true;
    }

    if (post.visibility === "PUBLIC") {
      return true;
    }

    if (post.visibility === "PRIVATE") {
      return false;
    }

    return Boolean(directUserFollows?.has(post.authorUserId) || (post.authorUser.workerProfile?.id && directWorkerFollows?.has(post.authorUser.workerProfile.id)));
  }

  private mapPost(post: any, actor?: ActorContext) {
    return {
      id: post.id,
      authorUserId: post.authorUserId,
      body: post.body,
      visibility: post.visibility,
      isDeleted: post.isDeleted,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        userId: post.authorUser.id,
        displayName: getDisplayName(post.authorUser.profile),
        avatarUrl: post.authorUser.profile?.avatarUrl ?? null,
        cityId: post.authorUser.profile?.cityId ?? null,
        workerProfileId: post.authorUser.workerProfile?.id ?? null
      },
      media: post.media.map((item: any) => ({
        id: item.id,
        mediaUrl: item.mediaUrl,
        mediaType: item.mediaType,
        sortOrder: item.sortOrder
      })),
      likeCount: post._count.likes,
      saveCount: post._count.saves,
      commentCount: post._count.comments,
      isLikedByViewer: actor ? Boolean(post.likes?.length) : false,
      isSavedByViewer: actor ? Boolean(post.saves?.length) : false
    };
  }

  private mapComment(comment: any, actor?: ActorContext) {
    return {
      id: comment.id,
      postId: comment.postId,
      parentCommentId: comment.parentCommentId,
      authorUserId: comment.authorUserId,
      body: comment.body,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        userId: comment.authorUser.id,
        displayName: getDisplayName(comment.authorUser.profile),
        avatarUrl: comment.authorUser.profile?.avatarUrl ?? null
      },
      likeCount: comment._count.likes,
      replyCount: comment._count.replies,
      isLikedByViewer: actor ? Boolean(comment.likes?.length) : false
    };
  }

  private assertPostOwner(actor: ActorContext, post: any): void {
    if (post.authorUserId !== actor.userId) {
      throw Errors.PERMISSION_DENIED();
    }
  }

  private assertCommentOwner(actor: ActorContext, comment: any): void {
    if (comment.authorUserId !== actor.userId) {
      throw Errors.PERMISSION_DENIED();
    }
  }

  private async getAccessiblePost(postId: string, actor?: ActorContext) {
    const post = await this.repository.getPostById(postId, actor?.userId);

    if (!post) {
      throw Errors.POST_NOT_FOUND();
    }

    if (!actor) {
      if (post.visibility !== "PUBLIC") {
        throw Errors.POST_NOT_FOUND();
      }

      return post;
    }

    const follows = await this.repository.listUserFollows(actor.userId);
    const directUserFollows = new Set(follows.filter((item) => item.targetType === "USER").map((item) => item.targetId));
    const directWorkerFollows = new Set(follows.filter((item) => item.targetType === "WORKER").map((item) => item.targetId));

    if (!this.canViewPost(post, actor, directUserFollows, directWorkerFollows)) {
      throw Errors.POST_NOT_FOUND();
    }

    return post;
  }

  async createPost(actor: ActorContext, data: { body: string; visibility: VisibilityScope; mediaRefs?: string[] }) {
    const sanitizedBody = stripHtml(data.body);
    const resolvedMedia = await Promise.all(
      (data.mediaRefs ?? []).map((mediaRef) =>
        this.mediaService.resolvePublicMediaInput(actor, mediaRef, [MediaCategory.post_image, MediaCategory.post_video])
      )
    );

    const post = await this.repository.createPost({
      authorUserId: actor.userId,
      body: sanitizedBody,
      visibility: data.visibility,
      media: resolvedMedia.map((media, index) => ({
        mediaAssetId: media.mediaAssetId,
        mediaUrl: media.mediaUrl,
        mediaType: media.mediaType,
        sortOrder: index
      }))
    });

    return this.mapPost(post, actor);
  }

  async getFeed(actor: ActorContext | undefined, params: { since?: string }, pagination: PaginationInput) {
    const [posts, followRows, actorCityId, rankingWeights] = await Promise.all([
      this.repository.listFeedCandidates({
        since: params.since ? new Date(params.since) : undefined,
        viewerUserId: actor?.userId
      }),
      actor ? this.repository.listUserFollows(actor.userId) : Promise.resolve([]),
      actor ? this.repository.getUserProfileCityId(actor.userId) : Promise.resolve(null),
      this.getFeedWeights()
    ]);

    const directUserFollows = new Set(followRows.filter((item) => item.targetType === "USER").map((item) => item.targetId));
    const directWorkerFollows = new Set(followRows.filter((item) => item.targetType === "WORKER").map((item) => item.targetId));
    const secondDegreeRows = actor && directUserFollows.size > 0 ? await this.repository.listFollowedUserAuthors([...directUserFollows]) : [];
    const secondDegreeUserFollows = new Set(secondDegreeRows.map((item) => item.targetId));

    const scoredPosts = posts
      .filter((post) => this.canViewPost(post, actor, directUserFollows, directWorkerFollows))
      .filter((post) => {
        if (!actor) {
          return post.visibility === "PUBLIC";
        }

        if (post.authorUserId === actor.userId) {
          return true;
        }

        const isDirectConnection =
          directUserFollows.has(post.authorUserId) || (post.authorUser.workerProfile?.id && directWorkerFollows.has(post.authorUser.workerProfile.id));
        const isSecondDegreePublic = post.visibility === "PUBLIC" && secondDegreeUserFollows.has(post.authorUserId);
        const isSameCityPublic = post.visibility === "PUBLIC" && Boolean(actorCityId && post.authorUser.profile?.cityId === actorCityId);

        return isDirectConnection || isSecondDegreePublic || isSameCityPublic;
      });

    const engagementMax = Math.max(
      1,
      ...scoredPosts.map((post) => post._count.likes * 1 + post._count.comments * 2 + post._count.saves * 3)
    );

    const rankedPosts = scoredPosts
      .map((post) => {
        const ageHours = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
        const recencyScore = 1 / (1 + ageHours / 24);
        const engagementScore = Math.min(1, (post._count.likes + post._count.comments * 2 + post._count.saves * 3) / engagementMax);
        const followRelationship = actor
          ? this.getPostAuthorRelationship(post, directUserFollows, directWorkerFollows, secondDegreeUserFollows, actorCityId)
          : post.visibility === "PUBLIC"
            ? 0.2
            : 0;
        const rankScore =
          recencyScore * rankingWeights.recency +
          engagementScore * rankingWeights.engagement +
          followRelationship * rankingWeights.follow_relationship;

        return {
          ...post,
          rankScore
        };
      })
      .sort((left, right) => {
        if (right.rankScore !== left.rankScore) {
          return right.rankScore - left.rankScore;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });

    const args = getPaginationArgs(pagination);

    return {
      data: rankedPosts.slice(args.skip, args.skip + args.take).map((post) => this.mapPost(post, actor)),
      pagination: buildPagination(pagination.page, pagination.limit, rankedPosts.length)
    };
  }

  async getPost(postId: string, actor?: ActorContext) {
    const post = await this.getAccessiblePost(postId, actor);
    return this.mapPost(post, actor);
  }

  async updatePost(actor: ActorContext, postId: string, data: Partial<{ body: string; visibility: VisibilityScope }>) {
    const existingPost = await this.getAccessiblePost(postId, actor);
    this.assertPostOwner(actor, existingPost);

    const updatedPost = await this.repository.updatePost(postId, {
      ...(data.body !== undefined ? { body: stripHtml(data.body) } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {})
    });

    return this.mapPost(updatedPost, actor);
  }

  async deletePost(actor: ActorContext, postId: string): Promise<void> {
    const existingPost = await this.getAccessiblePost(postId, actor);
    this.assertPostOwner(actor, existingPost);
    await this.repository.softDeletePost(postId);
  }

  async addPostMedia(actor: ActorContext, postId: string, mediaId: string, data: { mediaRef: string; mediaType: "image" | "video" }): Promise<void> {
    const existingPost = await this.getAccessiblePost(postId, actor);
    this.assertPostOwner(actor, existingPost);
    const resolvedMedia = await this.mediaService.resolvePublicMediaInput(actor, data.mediaRef, [
      MediaCategory.post_image,
      MediaCategory.post_video
    ]);
    await this.repository.addPostMedia(postId, mediaId, resolvedMedia.mediaUrl, resolvedMedia.mediaType, resolvedMedia.mediaAssetId);
  }

  async removePostMedia(actor: ActorContext, postId: string, mediaId: string): Promise<void> {
    const existingPost = await this.getAccessiblePost(postId, actor);
    this.assertPostOwner(actor, existingPost);
    await this.repository.removePostMedia(postId, mediaId);
  }

  async likePost(actor: ActorContext, postId: string): Promise<void> {
    const post = await this.getAccessiblePost(postId, actor);

    if (post.authorUserId === actor.userId) {
      throw Errors.PERMISSION_DENIED();
    }

    await this.repository.likePost(postId, actor.userId);
  }

  async unlikePost(actor: ActorContext, postId: string): Promise<void> {
    await this.getAccessiblePost(postId, actor);
    await this.repository.unlikePost(postId, actor.userId);
  }

  async savePost(actor: ActorContext, postId: string): Promise<void> {
    await this.getAccessiblePost(postId, actor);
    await this.repository.savePost(postId, actor.userId);
  }

  async unsavePost(actor: ActorContext, postId: string): Promise<void> {
    await this.getAccessiblePost(postId, actor);
    await this.repository.unsavePost(postId, actor.userId);
  }

  async createComment(actor: ActorContext, postId: string, data: { body: string; parentCommentId?: string }) {
    await this.getAccessiblePost(postId, actor);

    if (data.parentCommentId) {
      const parentComment = await this.repository.getCommentById(data.parentCommentId, actor.userId);

      if (!parentComment || parentComment.postId !== postId) {
        throw Errors.COMMENT_NOT_FOUND();
      }

      if (parentComment.parentCommentId) {
        throw Errors.COMMENT_REPLY_DEPTH_EXCEEDED();
      }
    }

    const comment = await this.repository.createComment({
      postId,
      parentCommentId: data.parentCommentId,
      authorUserId: actor.userId,
      body: stripHtml(data.body)
    });

    return this.mapComment(comment, actor);
  }

  async getComments(postId: string, pagination: PaginationInput, actor?: ActorContext) {
    await this.getAccessiblePost(postId, actor);
    const args = getPaginationArgs(pagination);
    const [comments, total] = await Promise.all([
      this.repository.listTopLevelComments(postId, args.skip, args.take, actor?.userId),
      this.repository.countTopLevelComments(postId)
    ]);

    return {
      data: comments.map((comment) => ({
        ...this.mapComment(comment, actor),
        replies: comment.replies.map((reply: any) => this.mapComment(reply, actor))
      })),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async updateComment(actor: ActorContext, commentId: string, data: { body: string }) {
    const comment = await this.repository.getCommentById(commentId, actor.userId);

    if (!comment) {
      throw Errors.COMMENT_NOT_FOUND();
    }

    this.assertCommentOwner(actor, comment);
    const updatedComment = await this.repository.updateComment(commentId, stripHtml(data.body));
    return this.mapComment(updatedComment, actor);
  }

  async deleteComment(actor: ActorContext, commentId: string): Promise<void> {
    const comment = await this.repository.getCommentById(commentId, actor.userId);

    if (!comment) {
      throw Errors.COMMENT_NOT_FOUND();
    }

    this.assertCommentOwner(actor, comment);
    await this.repository.softDeleteComment(commentId);
  }

  async likeComment(actor: ActorContext, commentId: string): Promise<void> {
    const comment = await this.repository.getCommentById(commentId, actor.userId);

    if (!comment) {
      throw Errors.COMMENT_NOT_FOUND();
    }

    await this.getAccessiblePost(comment.postId!, actor);
    await this.repository.likeComment(commentId, actor.userId);
  }

  async unlikeComment(actor: ActorContext, commentId: string): Promise<void> {
    const comment = await this.repository.getCommentById(commentId, actor.userId);

    if (!comment) {
      throw Errors.COMMENT_NOT_FOUND();
    }

    await this.getAccessiblePost(comment.postId!, actor);
    await this.repository.unlikeComment(commentId, actor.userId);
  }

  async reportComment(actor: ActorContext, commentId: string, data: { reason: string; severity: ModerationSeverity }): Promise<void> {
    const comment = await this.repository.getCommentById(commentId, actor.userId);

    if (!comment) {
      throw Errors.COMMENT_NOT_FOUND();
    }

    await this.getAccessiblePost(comment.postId!, actor);
    await this.repository.reportComment({
      commentId,
      reporterUserId: actor.userId,
      reason: stripHtml(data.reason)
    });
    await this.moderationService.createReport({
      reporterUserId: actor.userId,
      entityType: "COMMENT",
      entityId: commentId,
      reason: stripHtml(data.reason),
      severity: data.severity
    });
  }
}

export { SocialService };
