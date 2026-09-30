import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { rateLimit } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { chatController } from "./chat.controller";
import {
  AddAttachmentBody,
  AddParticipantBody,
  ConversationIdParams,
  ConversationMessageParams,
  ConversationParticipantParams,
  CreateConversationBody,
  GetConversationsQuery,
  GetMessagesQuery,
  MarkReadBody,
  MessageIdParams,
  MessageReactionBody,
  SendMessageBody
} from "./chat.schemas";

const chatRoutes = Router();

chatRoutes.post("/conversations", authenticate, validate(CreateConversationBody), chatController.createConversation);
chatRoutes.get("/conversations", authenticate, validate(GetConversationsQuery, "query"), chatController.getConversations);
chatRoutes.get("/conversations/:conversationId", authenticate, validate(ConversationIdParams, "params"), chatController.getConversation);
chatRoutes.post(
  "/conversations/:conversationId/participants",
  authenticate,
  validate(ConversationIdParams, "params"),
  validate(AddParticipantBody),
  chatController.addParticipant
);
chatRoutes.delete(
  "/conversations/:conversationId/participants/:userId",
  authenticate,
  validate(ConversationParticipantParams, "params"),
  chatController.removeParticipant
);
chatRoutes.get(
  "/conversations/:conversationId/messages",
  authenticate,
  validate(ConversationIdParams, "params"),
  validate(GetMessagesQuery, "query"),
  chatController.getMessages
);
chatRoutes.post(
  "/conversations/:conversationId/messages",
  authenticate,
  rateLimit((req) => `msg:${req.actor?.userId ?? "anonymous"}:${req.params.conversationId}`, 60_000, 30),
  validate(ConversationIdParams, "params"),
  validate(SendMessageBody),
  chatController.sendMessage
);
chatRoutes.post(
  "/conversations/:conversationId/messages/:messageId/attachments",
  authenticate,
  validate(ConversationMessageParams, "params"),
  validate(AddAttachmentBody),
  chatController.addAttachment
);
chatRoutes.post(
  "/conversations/:conversationId/read",
  authenticate,
  validate(ConversationIdParams, "params"),
  validate(MarkReadBody),
  chatController.markRead
);
chatRoutes.get("/inbox/unread-count", authenticate, chatController.getUnreadCount);

// Chat Message Reactions
chatRoutes.post(
  "/chat/messages/:messageId/reactions",
  authenticate,
  validate(MessageIdParams, "params"),
  validate(MessageReactionBody),
  chatController.addReaction
);
chatRoutes.delete(
  "/chat/messages/:messageId/reactions",
  authenticate,
  validate(MessageIdParams, "params"),
  chatController.removeReaction
);
chatRoutes.post(
  "/conversations/:conversationId/messages/:messageId/reactions",
  authenticate,
  validate(ConversationMessageParams, "params"),
  validate(MessageReactionBody),
  chatController.addReaction
);
chatRoutes.delete(
  "/conversations/:conversationId/messages/:messageId/reactions",
  authenticate,
  validate(ConversationMessageParams, "params"),
  chatController.removeReaction
);

export { chatRoutes };
