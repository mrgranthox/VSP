import { MediaCategory, type ConversationType, type MessageType } from "@prisma/client";

import { EventBus } from "../../lib/eventBus";
import { Errors } from "../../lib/errors";
import { inferMimeTypeFromRef } from "../../lib/media";
import { buildPagination, getPaginationArgs, type PaginationInput } from "../../lib/pagination";
import { redis } from "../../lib/redis";
import type { ActorContext } from "../../types/actor";
import { MediaService } from "../media/media.service";
import { ChatRepository } from "./chat.repository";

const CHAT_DEDUPE_TTL_SECONDS = 5 * 60;
const UNREAD_COUNT_TTL_SECONDS = 15;

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const getDisplayName = (profile: { firstName?: string | null; lastName?: string | null; displayName?: string | null } | null | undefined): string | null =>
  profile?.displayName ?? ([profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || null);

class ChatService {
  constructor(
    private readonly repository: ChatRepository = new ChatRepository(),
    private readonly mediaService: MediaService = new MediaService()
  ) {}

  private mapParticipant(participant: any) {
    return {
      userId: participant.user.id,
      joinedAt: participant.joinedAt,
      lastReadMessageId: participant.lastReadMessageId ?? null,
      displayName: getDisplayName(participant.user.profile),
      avatarUrl: participant.user.profile?.avatarUrl ?? null
    };
  }

  private mapAttachment(attachment: any) {
    return {
      id: attachment.id,
      fileUrl: attachment.fileUrl.startsWith("http")
        ? attachment.fileUrl
        : this.mediaService.getSignedPrivateReadUrl(attachment.fileUrl),
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes === null ? null : Number(attachment.sizeBytes),
      createdAt: attachment.createdAt
    };
  }

  private mapMessage(message: any) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      messageType: message.messageType,
      body: message.body,
      createdAt: message.createdAt,
      sender: {
        userId: message.sender.id,
        displayName: getDisplayName(message.sender.profile),
        avatarUrl: message.sender.profile?.avatarUrl ?? null
      },
      attachments: message.attachments.map((attachment: any) => this.mapAttachment(attachment))
    };
  }

  private mapConversation(conversation: any) {
    return {
      id: conversation.id,
      conversationType: conversation.conversationType,
      serviceRequestId: conversation.serviceRequestId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      participants: conversation.participants.map((participant: any) => this.mapParticipant(participant)),
      lastMessage: conversation.messages[0] ? this.mapMessage(conversation.messages[0]) : null
    };
  }

  private async assertActiveUsers(userIds: string[]): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];
    const users = await this.repository.findUsersByIds(uniqueUserIds);

    if (users.length !== uniqueUserIds.length) {
      throw Errors.USER_NOT_FOUND();
    }
  }

  private async validateServiceRequestParticipants(actor: ActorContext, serviceRequestId: string, participantUserIds: string[]): Promise<void> {
    const serviceRequest = await this.repository.getServiceRequestConversationAccess(serviceRequestId);

    if (!serviceRequest) {
      throw Errors.REQUEST_NOT_FOUND();
    }

    const allowedUserIds = new Set<string>([
      serviceRequest.customerUserId,
      ...(serviceRequest.preferredWorkerProfile?.userId ? [serviceRequest.preferredWorkerProfile.userId] : []),
      ...serviceRequest.assignments.map((assignment) => assignment.workerProfile.userId),
      ...(serviceRequest.booking?.customerUserId ? [serviceRequest.booking.customerUserId] : []),
      ...(serviceRequest.booking?.workerProfile.userId ? [serviceRequest.booking.workerProfile.userId] : [])
    ]);

    if (!allowedUserIds.has(actor.userId)) {
      throw Errors.PERMISSION_DENIED();
    }

    if (participantUserIds.some((userId) => !allowedUserIds.has(userId))) {
      throw Errors.PERMISSION_DENIED();
    }
  }

  private async getConversationOrThrow(conversationId: string) {
    const conversation = await this.repository.getConversationById(conversationId);

    if (!conversation) {
      throw Errors.CONVERSATION_NOT_FOUND();
    }

    return conversation;
  }

  private async assertConversationParticipant(actor: ActorContext, conversationId: string) {
    const [conversation, participant] = await Promise.all([
      this.getConversationOrThrow(conversationId),
      this.repository.getConversationParticipant(conversationId, actor.userId)
    ]);

    if (!participant) {
      throw Errors.CONVERSATION_ACCESS_DENIED();
    }

    return conversation;
  }

  private getDedupeKey(senderId: string, conversationId: string, clientMessageId: string): string {
    return `chat:dedupe:${senderId}:${conversationId}:${clientMessageId}`;
  }

  private getUnreadCountCacheKey(userId: string): string {
    return `chat:unread:${userId}`;
  }

  private async bustUnreadCountCache(userIds: string[]): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];

    if (uniqueUserIds.length === 0) {
      return;
    }

    await redis.del(...uniqueUserIds.map((userId) => this.getUnreadCountCacheKey(userId)));
  }

  async createOrGetConversation(
    actor: ActorContext,
    data: { type: ConversationType; participantIds: string[]; serviceRequestId?: string }
  ) {
    const participantUserIds = [...new Set([actor.userId, ...data.participantIds])];

    if (data.type === "DIRECT" && participantUserIds.length !== 2) {
      throw Errors.VALIDATION_FAILED({
        participantIds: ["DIRECT conversations require exactly one other participant"]
      });
    }

    await this.assertActiveUsers(participantUserIds);

    if (data.type === "SERVICE_REQUEST") {
      await this.validateServiceRequestParticipants(actor, data.serviceRequestId!, participantUserIds);
    }

    const existingConversation = await this.repository.findConversationByParticipantSet({
      type: data.type,
      participantUserIds,
      serviceRequestId: data.serviceRequestId
    });

    if (existingConversation) {
      return {
        conversation: this.mapConversation(existingConversation),
        created: false
      };
    }

    const conversation = await this.repository.createConversation({
      type: data.type,
      participantUserIds,
      serviceRequestId: data.serviceRequestId
    });

    return {
      conversation: this.mapConversation(conversation),
      created: true
    };
  }

  async getConversations(actor: ActorContext, pagination: PaginationInput) {
    const args = getPaginationArgs(pagination);
    const [conversations, total] = await Promise.all([
      this.repository.listConversations(actor.userId, args.skip, args.take),
      this.repository.countConversations(actor.userId)
    ]);

    return {
      data: conversations.map((conversation) => this.mapConversation(conversation)),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async getConversation(actor: ActorContext, conversationId: string) {
    const conversation = await this.assertConversationParticipant(actor, conversationId);
    return this.mapConversation(conversation);
  }

  async addParticipant(actor: ActorContext, conversationId: string, userId: string): Promise<void> {
    await this.assertConversationParticipant(actor, conversationId);
    await this.assertActiveUsers([userId]);
    await this.repository.addParticipant(conversationId, userId);
    await this.repository.touchConversation(conversationId);
    await this.bustUnreadCountCache([userId]);
  }

  async removeParticipant(actor: ActorContext, conversationId: string, userId: string): Promise<void> {
    await this.assertConversationParticipant(actor, conversationId);
    await this.repository.removeParticipant(conversationId, userId);
    await this.repository.touchConversation(conversationId);
    await this.bustUnreadCountCache([userId]);
  }

  async getMessages(
    actor: ActorContext,
    conversationId: string,
    params: { before?: string; after?: string },
    pagination: PaginationInput
  ) {
    await this.assertConversationParticipant(actor, conversationId);

    let beforeCreatedAt: Date | undefined;
    let afterCreatedAt: Date | undefined;

    if (params.before) {
      const cursorMessage = await this.repository.getConversationMessage(conversationId, params.before);

      if (!cursorMessage) {
        throw Errors.MESSAGE_NOT_FOUND();
      }

      beforeCreatedAt = cursorMessage.createdAt;
    }

    if (params.after) {
      const cursorMessage = await this.repository.getConversationMessage(conversationId, params.after);

      if (!cursorMessage) {
        throw Errors.MESSAGE_NOT_FOUND();
      }

      afterCreatedAt = cursorMessage.createdAt;
    }

    const args = getPaginationArgs(pagination);
    const [messages, total] = await Promise.all([
      this.repository.listMessages(conversationId, {
        skip: args.skip,
        take: args.take,
        beforeCreatedAt,
        afterCreatedAt
      }),
      this.repository.countMessages(conversationId, {
        beforeCreatedAt,
        afterCreatedAt
      })
    ]);

    const orderedMessages = afterCreatedAt ? messages : [...messages].reverse();

    return {
      data: orderedMessages.map((message) => this.mapMessage(message)),
      pagination: buildPagination(pagination.page, pagination.limit, total)
    };
  }

  async sendMessage(
    actor: ActorContext,
    conversationId: string,
    data: { clientMessageId: string; messageType: MessageType; body?: string; attachmentUploadRefs?: string[] }
  ) {
    const conversation = await this.assertConversationParticipant(actor, conversationId);
    const dedupeKey = this.getDedupeKey(actor.userId, conversationId, data.clientMessageId);
    const dedupedMessageId = await redis.get(dedupeKey);

    if (dedupedMessageId) {
      const existingMessage = await this.repository.getMessageById(dedupedMessageId);

      if (existingMessage) {
        return this.mapMessage(existingMessage);
      }
    }

    const resolvedAttachments = await Promise.all(
      (data.attachmentUploadRefs ?? []).map((mediaRef) =>
        this.mediaService.resolvePrivateMediaInput(actor, mediaRef, [MediaCategory.chat_attachment])
      )
    );

    const message = await this.repository.createMessage({
      conversationId,
      senderId: actor.userId,
      messageType: data.messageType,
      body: typeof data.body === "string" ? stripHtml(data.body) : null,
      attachments: resolvedAttachments.map((attachment) => ({
        mediaAssetId: attachment.mediaAssetId,
        fileUrl: attachment.fileUrl,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes
      }))
    });

    await redis.set(dedupeKey, message.id, "EX", CHAT_DEDUPE_TTL_SECONDS);

    const receiverIds = conversation.participants.map((participant) => participant.userId).filter((userId) => userId !== actor.userId);
    await this.bustUnreadCountCache(receiverIds);

    await EventBus.emit("MESSAGE_SENT", {
      messageId: message.id,
      conversationId,
      senderId: actor.userId,
      receiverIds,
      messageType: data.messageType
    });

    return this.mapMessage(message);
  }

  async addAttachment(actor: ActorContext, conversationId: string, messageId: string, data: { mediaRef: string }): Promise<void> {
    await this.assertConversationParticipant(actor, conversationId);
    const message = await this.repository.getConversationMessage(conversationId, messageId);

    if (!message) {
      throw Errors.MESSAGE_NOT_FOUND();
    }

    const attachment = await this.mediaService.resolvePrivateMediaInput(actor, data.mediaRef, [MediaCategory.chat_attachment]);

    await this.repository.addMessageAttachment(messageId, {
      mediaAssetId: attachment.mediaAssetId,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType ?? inferMimeTypeFromRef(data.mediaRef),
      sizeBytes: attachment.sizeBytes
    });
    await this.repository.touchConversation(conversationId);
  }

  async markRead(actor: ActorContext, conversationId: string, lastReadMessageId: string): Promise<void> {
    await this.assertConversationParticipant(actor, conversationId);
    const message = await this.repository.getConversationMessage(conversationId, lastReadMessageId);

    if (!message) {
      throw Errors.MESSAGE_NOT_FOUND();
    }

    const unreadMessages = await this.repository.getUnreadMessageIdsUpTo(conversationId, actor.userId, message.createdAt);

    await this.repository.markMessagesRead(
      conversationId,
      actor.userId,
      unreadMessages.map((item) => item.id),
      lastReadMessageId
    );
    await this.bustUnreadCountCache([actor.userId]);
  }

  async getUnreadCount(actor: ActorContext) {
    const cacheKey = this.getUnreadCountCacheKey(actor.userId);
    const cachedValue = await redis.get(cacheKey);

    if (cachedValue) {
      return {
        count: Number.parseInt(cachedValue, 10)
      };
    }

    const count = await this.repository.getUnreadCount(actor.userId);
    await redis.set(cacheKey, String(count), "EX", UNREAD_COUNT_TTL_SECONDS);

    return { count };
  }

  async assertParticipant(userId: string, conversationId: string): Promise<boolean> {
    return this.repository.isParticipant(userId, conversationId);
  }

  async addMessageReaction(actor: ActorContext, messageId: string, emoji = "👍") {
    const key = `chat:msg:reactions:${messageId}`;
    await redis.hset(key, actor.userId, emoji);
    return {
      messageId,
      userId: actor.userId,
      emoji,
      success: true
    };
  }

  async removeMessageReaction(actor: ActorContext, messageId: string) {
    const key = `chat:msg:reactions:${messageId}`;
    await redis.hdel(key, actor.userId);
    return {
      messageId,
      userId: actor.userId,
      success: true
    };
  }
}

export { ChatService };
