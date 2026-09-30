import { type Request, type Response } from "express";

import { Errors } from "../../lib/errors";
import type { PaginationInput } from "../../lib/pagination";
import { paginated, success } from "../../lib/response";
import { ChatService } from "./chat.service";

class ChatController {
  constructor(private readonly chatService: ChatService = new ChatService()) {}

  private getRequestId(req: Request): string | undefined {
    return typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  }

  createConversation = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.chatService.createOrGetConversation(req.actor, req.body);
    res.status(result.created ? 201 : 200).json(success(result.conversation, { requestId: this.getRequestId(req) }));
  };

  getConversations = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.chatService.getConversations(req.actor, req.query as unknown as PaginationInput);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  getConversation = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.chatService.getConversation(req.actor, req.params.conversationId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  addParticipant = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.chatService.addParticipant(req.actor, req.params.conversationId, req.body.userId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  removeParticipant = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.chatService.removeParticipant(req.actor, req.params.conversationId, req.params.userId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  getMessages = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const query = req.query as unknown as { before?: string; after?: string } & PaginationInput;
    const result = await this.chatService.getMessages(req.actor, req.params.conversationId, query, query);
    res.status(200).json(paginated(result.data, result.pagination, { requestId: this.getRequestId(req) }));
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.chatService.sendMessage(req.actor, req.params.conversationId, req.body);
    res.status(201).json(success(result, { requestId: this.getRequestId(req) }));
  };

  addAttachment = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.chatService.addAttachment(req.actor, req.params.conversationId, req.params.messageId, req.body);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    await this.chatService.markRead(req.actor, req.params.conversationId, req.body.lastReadMessageId);
    res.status(200).json(success({}, { requestId: this.getRequestId(req) }));
  };

  getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }

    const result = await this.chatService.getUnreadCount(req.actor);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  addReaction = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
    const emoji = req.body?.emoji ?? "👍";
    const result = await this.chatService.addMessageReaction(req.actor, req.params.messageId, emoji);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };

  removeReaction = async (req: Request, res: Response): Promise<void> => {
    if (!req.actor) {
      throw Errors.AUTH_SESSION_EXPIRED();
    }
    const result = await this.chatService.removeMessageReaction(req.actor, req.params.messageId);
    res.status(200).json(success(result, { requestId: this.getRequestId(req) }));
  };
}

const chatController = new ChatController();

export { ChatController, chatController };
