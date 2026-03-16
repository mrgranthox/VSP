# MODULE: reviews
# File: src/modules/reviews/

## PRISMA MODELS
```prisma
model Review {
  id             String   @id @default(uuid())
  bookingId      String   @unique  // 1:1 — one review per booking
  reviewerUserId String
  revieweeUserId String
  rating         Int      // integer 1–5
  body           String?  // max 2000 chars
  createdAt      DateTime @default(now())
  @@index([revieweeUserId, createdAt])
}
model ReviewDimensionScore {
  id           String @id @default(uuid())
  reviewId     String
  dimensionKey String // quality | communication | punctuality | value
  score        Int    // integer 1–5
  @@unique([reviewId, dimensionKey])
}
model ReviewReply {
  id           String   @id @default(uuid())
  reviewId     String
  authorUserId String
  body         String   // max 1000 chars
  createdAt    DateTime @default(now())
  @@index([reviewId, createdAt])
}
```

## ENDPOINTS (8)
POST   /api/v1/reviews
GET    /api/v1/reviews/:reviewId
GET    /api/v1/workers/:workerId/reviews
POST   /api/v1/reviews/:reviewId/dimensions
POST   /api/v1/reviews/:reviewId/replies
PATCH  /api/v1/reviews/:reviewId/replies/:replyId
DELETE /api/v1/reviews/:reviewId/replies/:replyId
POST   /api/v1/reviews/:reviewId/report

## ZOD SCHEMAS
```typescript
export const CreateReviewBody = z.object({
  bookingId:  z.string().uuid(),
  rating:     z.number().int().min(1).max(5),
  body:       z.string().max(2000).optional(),
  dimensions: z.array(z.object({
    dimensionKey: z.enum(['quality','communication','punctuality','value']),
    score:        z.number().int().min(1).max(5),
  })).max(4).optional(),
}).strict();
export const AddDimensionsBody = z.object({
  dimensions: z.array(z.object({
    dimensionKey: z.enum(['quality','communication','punctuality','value']),
    score: z.number().int().min(1).max(5),
  })).min(1).max(4),
}).strict();
export const CreateReplyBody  = z.object({ body: z.string().min(1).max(1000).trim() }).strict();
export const GetWorkerReviewsQuery = z.object({
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
});
```

## ELIGIBILITY GUARD (assertReviewEligible — run before create)
1. Booking must exist and status=COMPLETED                → REVIEW_NOT_ALLOWED if not
2. reviewerUserId must be booking.customerUserId          → PERMISSION_DENIED if not
3. booking.completedAt must be within review_window_hours → REVIEW_NOT_ALLOWED if expired
   review_window_hours = system_config (default 168h = 7 days)
4. No existing review for this bookingId                  → REVIEW_NOT_ALLOWED if duplicate
5. reviewerUserId !== revieweeUserId                      → REVIEW_NOT_ALLOWED (no self-review)

## AFTER CREATE — update worker aggregates (call worker-profiles service)
workerProfileService.recalculateAggregates(workerProfileId)
Then: emit REVIEW_SUBMITTED → search module (update Typesense avg_rating)

## EVENTS EMITTED
REVIEW_SUBMITTED → { reviewId, revieweeUserId, workerProfileId, rating } → search, notifications, analytics

## SEED FIXTURE
Review: id=ffffffff-0003-4000-f000-000000000003
  bookingId=ffffffff-0002-..., reviewer=Alice, reviewee=Bob, rating=5
  dimensions: quality=5, communication=5, punctuality=4, value=5

---
# MODULE: moderation
# File: src/modules/moderation/

## PRISMA MODELS
```prisma
model Report {
  id             String             @id @default(uuid())
  reporterUserId String
  entityType     String   // post|comment|review|message|worker|user
  entityId       String
  reason         String   // max 255 chars
  severity       ModerationSeverity @default(MEDIUM)
  status         ReportStatus       @default(OPEN)
  createdAt      DateTime @default(now())
  @@index([entityType, entityId])
  @@index([reporterUserId, createdAt])
}
model ModerationCase {
  id                  String              @id @default(uuid())
  reportId            String?
  assignedAdminUserId String?
  status              ModerationCaseStatus @default(OPEN)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@index([status, createdAt])
}
model ModerationAction {
  id                    String   @id @default(uuid())
  moderationCaseId      String
  performedByAdminUserId String
  actionType            String   // CONTENT_REMOVED|USER_WARNED|WORKER_SUSPENDED|CASE_DISMISSED etc.
  entityType            String
  entityId              String
  notes                 String?
  createdAt             DateTime @default(now())
  @@index([moderationCaseId, createdAt])
}
model FraudSignal {
  id         String           @id @default(uuid())
  userId     String?
  entityType String?
  entityId   String?
  signalKey  String
  score      Decimal
  status     FraudSignalStatus @default(OPEN)
  createdAt  DateTime @default(now())
  @@index([signalKey, status])
}
enum ModerationSeverity  { LOW MEDIUM HIGH CRITICAL }
enum ReportStatus        { OPEN UNDER_REVIEW RESOLVED DISMISSED }
enum ModerationCaseStatus{ OPEN IN_REVIEW ACTIONED DISMISSED CLOSED }
enum FraudSignalStatus   { OPEN REVIEWED DISMISSED ACTIONED }
```

## FRAUD SIGNAL SCORING
SUSPICIOUS_REVIEW_PATTERN(40): 3+ reviews by same user within 1 hour
RAPID_ACCOUNT_CREATION(30):    3+ accounts from same IP within 1 hour
REPEATED_FAILED_VERIFICATION(25): worker rejected 3 times in 30 days
UNNATURAL_LOCATION_JUMP(35):   location jumps >500km in 1 hour
BOOKING_ABUSE(50):             3+ worker cancellations in 7 days
SPAM_CONTENT(45):              post/comment reported by 5+ users in 24h
MALWARE_DETECTED(100):         ClamAV positive
REVIEW_RECIPROCAL_PATTERN(60): worker A reviews B, B reviews A within 24h
REFRESH_TOKEN_REUSE(80):       from auth module

Score thresholds (system_config):
fraud_score_moderation_threshold=70 → auto-create moderation case
fraud_score_auto_suspend_threshold=90 → create CRITICAL case, alert admin (no auto-suspend — human required)

## EVENTS CONSUMED
FRAUD_SIGNAL_CREATED → fraud_signal_evaluator job
Any report creation above threshold → auto-create ModerationCase

## SEED FIXTURE
Report:  id=ffffffff-0009-4000-f000-000000000009, entityType=post, entityId=fixturePost, status=OPEN
ModeCase:id=ffffffff-0008-4000-f000-000000000008, reportId=fixtureReport, assigned=moderator, status=OPEN

---
# MODULE: notifications
# File: src/modules/notifications/

## PRISMA MODELS
```prisma
model Notification {
  id               String              @id @default(uuid())
  userId           String
  channel          NotificationChannel @default(IN_APP)
  notificationType String  // BOOKING_CONFIRMED|NEW_MESSAGE|REQUEST_ASSIGNED|REVIEW_RECEIVED etc.
  payloadJson      Json    // typed per notificationType — see payload contracts below
  isRead           Boolean @default(false)
  readAt           DateTime?
  createdAt        DateTime @default(now())
  @@index([userId, createdAt])
  @@index([userId, isRead])
}
model PushDevice {
  id           String   @id @default(uuid())
  userId       String
  deviceToken  String   @unique
  platform     String   // ios | android | web
  lastSeenAt   DateTime?
  createdAt    DateTime @default(now())
  @@index([userId, createdAt])
}
enum NotificationChannel { IN_APP PUSH EMAIL SMS }
```

## PAYLOAD CONTRACTS (payloadJson shape per type)
BOOKING_CONFIRMED:            { bookingId, workerName, workerAvatarUrl, scheduledStart, tradeName }
BOOKING_CANCELLED:            { bookingId, cancelledBy: 'customer'|'worker'|'admin', reason, scheduledStart }
NEW_MESSAGE:                  { conversationId, messageId, senderName, senderAvatarUrl, messagePreview, messageType }
REQUEST_ASSIGNED:             { requestId, tradeName, assignmentId, title }
REVIEW_RECEIVED:              { reviewId, rating, reviewerName, reviewerAvatarUrl, reviewPreview }
VERIFICATION_APPROVED:        { workerId }
VERIFICATION_REJECTED:        { workerId, reviewNotes }
FEATURED_EXPIRING:            { subscriptionId, endsAt, daysRemaining }
BOOKING_RESCHEDULE_REQUESTED: { bookingId, rescheduleId, requestedByName, newStart, newEnd }
BOOKING_RESCHEDULE_RESPONDED: { bookingId, rescheduleId, action: 'ACCEPTED'|'DECLINED' }

## DURABILITY RULE (CRITICAL)
Notification records created REGARDLESS of delivery channel success.
Quiet hours suppress push/email fan-out but NEVER suppress record creation.
quietHoursStart/End in user's local timezone (city_configs.timezone).

## FANOUT JOB (notification_fanout queue — concurrency 10, 5 retries exponential)
1. Load notification + user's push devices + notification preferences
2. Check quiet hours in user's timezone
3. Dispatch to FCM (Android/web) or APNs (iOS) using device_token
4. FCM batch size: FCM_BATCH_SIZE (env, default 500)
5. On token invalid error: delete push_device record (stale token)
6. Update push_device.lastSeenAt on successful delivery
7. After PUSH_STALE_TOKEN_DAYS (env, default 60) without delivery: prune via token_cleanup job

## UNREAD COUNT
Redis key: notif:unread:{userId}, TTL 15s
Derive from: COUNT notifications WHERE userId=X AND isRead=false
Bust on: notification create, markRead, markAllRead

## ENDPOINTS (7)
GET    /api/v1/notifications
POST   /api/v1/notifications/read-all
POST   /api/v1/notifications/:notificationId/read
GET    /api/v1/notifications/preferences
PATCH  /api/v1/notifications/preferences
POST   /api/v1/push-devices
DELETE /api/v1/push-devices/:deviceId
