# MODULE: chat
# File: src/modules/chat/

## PRISMA MODELS
```prisma
model Conversation {
  id               String           @id @default(uuid())
  conversationType ConversationType
  serviceRequestId String?          // FK service_requests — nullable
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  @@index([conversationType, updatedAt])
}
model ConversationParticipant {
  id                 String   @id @default(uuid())
  conversationId     String
  userId             String
  joinedAt           DateTime @default(now())
  lastReadMessageId  String?  // FK messages — for unread count derivation
  @@unique([conversationId, userId])
  @@index([userId, joinedAt])
}
model Message {
  id             String      @id @default(uuid())
  conversationId String
  senderId       String
  messageType    MessageType @default(TEXT)
  body           String?     // null for image/file messages
  createdAt      DateTime    @default(now())
  @@index([conversationId, createdAt])
  @@index([senderId, createdAt])
}
model MessageAttachment {
  id        String   @id @default(uuid())
  messageId String
  fileUrl   String   // private storage — signed URL only
  mimeType  String
  sizeBytes BigInt?
  createdAt DateTime @default(now())
  @@index([messageId])
}
model MessageRead {
  id        String   @id @default(uuid())
  messageId String
  userId    String
  readAt    DateTime @default(now())
  @@unique([messageId, userId])
  @@index([userId, readAt])
}
enum ConversationType { DIRECT SERVICE_REQUEST SUPPORT }
enum MessageType      { TEXT IMAGE FILE SYSTEM }
```

## ENDPOINTS (10)
POST   /api/v1/conversations
GET    /api/v1/conversations
GET    /api/v1/conversations/:conversationId
POST   /api/v1/conversations/:conversationId/participants
DELETE /api/v1/conversations/:conversationId/participants/:userId
GET    /api/v1/conversations/:conversationId/messages
POST   /api/v1/conversations/:conversationId/messages
POST   /api/v1/conversations/:conversationId/messages/:messageId/attachments
POST   /api/v1/conversations/:conversationId/read
GET    /api/v1/inbox/unread-count

## ZOD SCHEMAS
```typescript
export const CreateConversationBody = z.object({
  type:             z.enum(['DIRECT','SERVICE_REQUEST','SUPPORT']),
  participantIds:   z.array(z.string().uuid()).min(1).max(10),
  serviceRequestId: z.string().uuid().optional(),
}).strict().refine(
  d => d.type !== 'SERVICE_REQUEST' || d.serviceRequestId !== undefined,
  { message: 'serviceRequestId required for SERVICE_REQUEST type' }
);

export const SendMessageBody = z.object({
  clientMessageId:      z.string().uuid(),
  messageType:          z.enum(['TEXT','IMAGE','FILE','SYSTEM']),
  body:                 z.string().min(1).max(10000).optional(),
  attachmentUploadRefs: z.array(z.string().min(1)).max(5).optional(),
}).strict().refine(d => d.messageType !== 'TEXT' || !!d.body, { message: 'body required for TEXT' });

export const MarkReadBody  = z.object({ lastReadMessageId: z.string().uuid() }).strict();
export const GetMessagesQuery = z.object({
  before: z.string().uuid().optional(),
  after:  z.string().uuid().optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(50),
});
```

## DURABILITY RULE (CRITICAL)
Messages MUST be persisted to DB before broadcast to WebSocket.
If WS connection drops, message is NOT lost — client reconnects and fetches via HTTP GET messages.

## CLIENT MESSAGE DEDUPLICATION
clientMessageId deduplication window: 5 minutes.
If same clientMessageId received again within window → return original message (do not create duplicate).
Check: find message WHERE conversationId=X AND senderId=Y AND clientMessageId=Z AND createdAt > NOW()-5min

## UNREAD COUNT DERIVATION
SELECT COUNT(m.id) FROM messages m
JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = :userId
LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = :userId
WHERE mr.id IS NULL AND m.sender_id != :userId
Cache in Redis: key=notif:unread:{userId}, TTL=15s, bust on new message or markRead

## SERVICE INTERFACE
```typescript
interface IChatService {
  createOrGetConversation(actor, data: { type, participantIds, serviceRequestId? }): Promise<Conversation>;
  getConversations(actor, pagination): Promise<PaginatedResult<Conversation>>;
  getConversation(actor, conversationId): Promise<Conversation>;
  addParticipant(actor, conversationId, userId): Promise<void>;
  removeParticipant(actor, conversationId, userId): Promise<void>;
  getMessages(actor, conversationId, cursor, pagination): Promise<PaginatedResult<Message>>;
  sendMessage(actor, conversationId, data: SendMessageData): Promise<Message>;
  markRead(actor, conversationId, lastReadMessageId): Promise<void>;
  getUnreadCount(actor): Promise<{ count: number }>;
  assertParticipant(userId, conversationId): Promise<boolean>; // used by WebSocket gateway
}
```

## PERMISSION RULE
Only conversation participants can read messages or send messages.
CONVERSATION_ACCESS_DENIED (403) if not a participant.

## EVENTS EMITTED
MESSAGE_SENT → { messageId, conversationId, senderId, receiverIds[], messageType }
Consumed by: notifications (push to recipients)

## RATE LIMIT
30 messages/min per user per conversation. Key: rl:msg:{userId}:{conversationId}

## SEED FIXTURE
Conversation: id=ffffffff-0005-4000-f000-000000000005, type=DIRECT
Participants: Alice (aaaaaaaa-0005...) and Bob (aaaaaaaa-0006...)
Message: id=ffffffff-0006-4000-f000-000000000006, sender=Alice, type=TEXT
