# CROSS-CUTTING: WebSocket Gateway
# File: src/gateway/websocket.ts
# Service: ws-gateway (separate container from api-server)

## STACK
ws npm package (not socket.io), Redis for presence, BullMQ for notification fan-out

## CONNECTION URL
wss://api.vocationalplatform.com/ws?token=<accessToken>
Auth: validate JWT on connect. Disconnect with code 4001 if invalid or expired.
Timeout: if no valid auth within WS_AUTH_TIMEOUT_MS (env, default 10s) → close with 4001

## PRESENCE (Redis)
On connect: SET presence:{userId} = { connectedAt, socketId } EX WS_PRESENCE_TTL_SECONDS (45)
On heartbeat (ping event): EXPIRE presence:{userId} WS_PRESENCE_TTL_SECONDS
On disconnect: DEL presence:{userId}
Max concurrent connections per user: WS_MAX_CONNECTIONS_PER_USER (env, default 5)

## CLIENT → SERVER EVENTS
```typescript
// All messages have shape: { event: string, payload: object }

conversation.join    → payload: { conversationId: string }
  Server validates: assertParticipant(userId, conversationId) → 403 if false
  Server: add socket to room `conv:{conversationId}`

conversation.leave   → payload: { conversationId: string }
  Server: remove socket from room

message.send         → payload: {
    clientMessageId: string (uuid),
    conversationId:  string (uuid),
    messageType:     'TEXT'|'IMAGE'|'FILE'|'SYSTEM',
    body?:           string,
    attachmentUploadRefs?: string[]
  }
  Server: call chatService.sendMessage() → persist → broadcast message.created to room
  Deduplication: if clientMessageId seen within 5 min → return existing message (no duplicate)

message.read         → payload: { conversationId: string, messageId: string }
  Server: call chatService.markRead() → emit message.read to room

typing.start         → payload: { conversationId: string }
  Server: broadcast typing.started to room (except sender)

typing.stop          → payload: { conversationId: string }
  Server: broadcast typing.stopped to room (except sender)

ping                 → payload: {}
  Server: refresh presence TTL, respond with { event: 'pong' }
```

## SERVER → CLIENT EVENTS
```typescript
message.created      → { messageId, conversationId, senderId, messageType, body, createdAt }
message.read         → { conversationId, messageId, readerUserId, readAt }
typing.started       → { conversationId, userId }
typing.stopped       → { conversationId, userId }
presence.online      → { userId }
presence.offline     → { userId }
notification.created → { notificationId, notificationType, payloadJson }
  // Emitted when notification_fanout job delivers to connected user
  // Job checks presence:{userId} before sending via WS vs push
connected            → { userId } (sent on successful auth)
error                → { code: string, message: string }
```

## NOTIFICATION DELIVERY DECISION
In notification_fanout job:
1. Check Redis: GET presence:{userId}
2. If key exists (user connected): emit notification.created via WS socket (skip PUSH)
3. If key missing (user offline): send PUSH via FCM/APNs
4. IN_APP channel: always create notification record + emit via WS if online

## RECONNECTION + BACKFILL
On client reconnect, client calls:
GET /api/v1/conversations/:conversationId/messages?after={lastMessageId}
This fetches any messages missed during disconnect.

## RATE LIMIT (WebSocket)
30 message.send events per minute per user per conversation
Track in Redis: rl:wsmsg:{userId}:{conversationId}, sliding window 60s
Exceed → send error event, do not disconnect

## MAX PAYLOAD
WS_MAX_PAYLOAD_BYTES (env, default 65536 = 64KB)
Messages exceeding limit → close with code 1009

## HEARTBEAT
Server sends ping every WS_HEARTBEAT_INTERVAL_MS (env, default 30000ms)
Client must respond with pong within 10s or connection is closed
