# MODULE: social
# File: src/modules/social/

## PRISMA MODELS
```prisma
model Post {
  id           String         @id @default(uuid())
  authorUserId String
  body         String         // max 3000 chars, HTML stripped server-side
  visibility   VisibilityScope @default(PUBLIC)
  isDeleted    Boolean        @default(false)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  @@index([authorUserId, createdAt])
  @@index([createdAt])
}
model PostMedia {
  id        String   @id @default(uuid())
  postId    String
  mediaUrl  String   // CDN URL after processing
  mediaType String   // image | video
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  @@index([postId, sortOrder])
}
model PostLike {
  id        String   @id @default(uuid())
  postId    String
  userId    String
  createdAt DateTime @default(now())
  @@unique([postId, userId])
}
model PostSave {
  id        String   @id @default(uuid())
  postId    String
  userId    String
  createdAt DateTime @default(now())
  @@unique([postId, userId])
}
model Comment {
  id              String   @id @default(uuid())
  postId          String?
  reviewId        String?
  parentCommentId String?  // self-referential — one level deep enforced in service
  authorUserId    String
  body            String   // max 1000 chars, HTML stripped
  isDeleted       Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([postId, createdAt])
  @@index([reviewId, createdAt])
}
model CommentLike {
  id        String   @id @default(uuid())
  commentId String
  userId    String
  createdAt DateTime @default(now())
  @@unique([commentId, userId])
}
model CommentReport {
  id             String   @id @default(uuid())
  commentId      String
  reporterUserId String
  reason         String
  createdAt      DateTime @default(now())
  @@index([commentId])
}
enum VisibilityScope { PUBLIC CONNECTIONS PRIVATE }
```

## ENDPOINTS (18)
POST/GET             /api/v1/posts
GET/PATCH/DELETE     /api/v1/posts/:postId
POST/DELETE          /api/v1/posts/:postId/media/:mediaId
POST/DELETE          /api/v1/posts/:postId/likes
POST/DELETE          /api/v1/posts/:postId/saves
POST/GET             /api/v1/posts/:postId/comments
PATCH/DELETE         /api/v1/comments/:commentId
POST/DELETE          /api/v1/comments/:commentId/likes
POST                 /api/v1/comments/:commentId/reports

## ZOD SCHEMAS
```typescript
export const CreatePostBody = z.object({
  body:       z.string().min(1).max(3000).trim(),
  visibility: z.enum(['PUBLIC','CONNECTIONS','PRIVATE']).default('PUBLIC'),
  mediaRefs:  z.array(z.string().min(1)).max(10).optional(),
}).strict();

export const UpdatePostBody = z.object({
  body:       z.string().min(1).max(3000).trim().optional(),
  visibility: z.enum(['PUBLIC','CONNECTIONS','PRIVATE']).optional(),
}).strict();

export const CreateCommentBody = z.object({
  body:            z.string().min(1).max(1000).trim(),
  parentCommentId: z.string().uuid().optional(),
}).strict();

export const UpdateCommentBody = z.object({
  body: z.string().min(1).max(1000).trim(),
}).strict();

export const GetFeedQuery = z.object({
  since: z.string().datetime().optional(),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

## FEED RANKING ALGORITHM
Score = (recency × 0.50) + (engagement × 0.30) + (follow_relationship × 0.20)
recency = 1 / (1 + hours_since_post / 24) — posts older than 7 days score near 0
engagement = (likes×1 + comments×2 + saves×3) / max(1, normalised_max) capped at 1.0
follow_relationship: 1.0=followed, 0.5=followed-of-followed, 0.2=same-city public

Feed includes: posts from followed users/workers + public posts from actor's city.
isDeleted=true posts NEVER appear.
Weights stored in system_config key: feed_ranking_weights

## BUSINESS LOGIC RULES
- Self-like blocked: userId !== post.authorUserId on like
- Self-comment allowed
- parentCommentId: service enforces max depth of 1 (no replies to replies)
- deletePost: sets isDeleted=true (soft delete). Admin hard-delete uses admin module.
- deleteComment: sets isDeleted=true (soft delete)
- mediaRefs on createPost: pass each ref to media module to confirm upload, then create PostMedia
- CommentReport → creates Report record in moderation module (cross-module call via service)
- visibility=CONNECTIONS: return only if actor follows the author (check user_follows)

## EVENTS EMITTED
(none — social module does not emit domain events currently)

## SEED FIXTURE
Post: id=ffffffff-0004-4000-f000-000000000004, authorUserId=Bob, visibility=PUBLIC
