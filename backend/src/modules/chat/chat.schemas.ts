import { z } from "zod";

const UUIDSchema = z.string().uuid();
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const CreateConversationBody = z
  .object({
    type: z.enum(["DIRECT", "SERVICE_REQUEST", "SUPPORT"]),
    participantIds: z.array(UUIDSchema).min(1).max(10),
    serviceRequestId: UUIDSchema.optional()
  })
  .strict()
  .refine((data) => data.type !== "SERVICE_REQUEST" || Boolean(data.serviceRequestId), {
    message: "serviceRequestId required for SERVICE_REQUEST conversation type",
    path: ["serviceRequestId"]
  });

const ConversationIdParams = z.object({
  conversationId: UUIDSchema
});

const ConversationParticipantParams = z.object({
  conversationId: UUIDSchema,
  userId: UUIDSchema
});

const AddParticipantBody = z
  .object({
    userId: UUIDSchema
  })
  .strict();

const GetConversationsQuery = PaginationSchema;

const GetMessagesQuery = z
  .object({
    before: UUIDSchema.optional(),
    after: UUIDSchema.optional()
  })
  .merge(PaginationSchema)
  .refine((data) => !(data.before && data.after), {
    message: "before and after cannot be used together",
    path: ["before"]
  });

const SendMessageBody = z
  .object({
    clientMessageId: UUIDSchema,
    messageType: z.enum(["TEXT", "IMAGE", "FILE", "SYSTEM"]),
    body: z.string().min(1).max(10000).optional(),
    attachmentUploadRefs: z.array(z.string().min(1)).max(5).optional()
  })
  .strict()
  .refine((data) => (data.messageType === "TEXT" ? Boolean(data.body) : true), {
    message: "body is required for TEXT messages",
    path: ["body"]
  })
  .refine((data) => (data.messageType === "IMAGE" || data.messageType === "FILE" ? Boolean(data.attachmentUploadRefs?.length) : true), {
    message: "attachmentUploadRefs are required for IMAGE and FILE messages",
    path: ["attachmentUploadRefs"]
  });

const MarkReadBody = z
  .object({
    lastReadMessageId: UUIDSchema
  })
  .strict();

const ConversationMessageParams = z.object({
  conversationId: UUIDSchema,
  messageId: UUIDSchema
});

const AddAttachmentBody = z
  .object({
    mediaRef: z.string().min(1)
  })
  .strict();

export {
  AddAttachmentBody,
  AddParticipantBody,
  ConversationIdParams,
  ConversationMessageParams,
  ConversationParticipantParams,
  CreateConversationBody,
  GetConversationsQuery,
  GetMessagesQuery,
  MarkReadBody,
  SendMessageBody
};
