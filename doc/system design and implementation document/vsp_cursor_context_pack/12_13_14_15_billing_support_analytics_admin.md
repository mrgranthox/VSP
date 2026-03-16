# MODULE: billing
# File: src/modules/billing/

## PRISMA MODELS
```prisma
model PaymentIntent {
  id           String              @id @default(uuid())
  userId       String
  bookingId    String?
  amountMinor  Int                 // minor currency units
  currencyCode String              // ISO 4217
  status       PaymentIntentStatus @default(CREATED)
  providerRef  String?             // Stripe/Paystack reference
  createdAt    DateTime            @default(now())
  @@index([userId, createdAt])
  @@index([status, createdAt])
}
model PlatformFee {
  id              String   @id @default(uuid())
  paymentIntentId String
  feeMinor        Int
  feeType         String   // BOOST_FEE | PLATFORM_COMMISSION
  createdAt       DateTime @default(now())
}
model WorkerFeaturedSubscription {
  id                   String             @id @default(uuid())
  workerProfileId      String
  startsAt             DateTime
  endsAt               DateTime
  status               SubscriptionStatus
  sourcePaymentIntentId String?
  createdAt            DateTime @default(now())
  @@index([workerProfileId, status])
  @@index([status, endsAt])
}
model WorkerSubscriptionInvoice {
  id              String        @id @default(uuid())
  workerProfileId String
  amountMinor     Int
  currencyCode    String
  status          InvoiceStatus
  providerRef     String?
  createdAt       DateTime @default(now())
}
enum PaymentIntentStatus { CREATED PENDING SUCCEEDED FAILED CANCELLED REFUNDED }
enum SubscriptionStatus  { ACTIVE EXPIRED CANCELLED PENDING }
enum InvoiceStatus       { PENDING PAID FAILED VOID }
```

## WEBHOOK HANDLER — CRITICAL RULES
1. Use express.raw() middleware on this route — raw body needed for HMAC
2. Verify HMAC before any processing
3. Return 200 immediately after signature verification
4. Enqueue webhook_process BullMQ job for async processing
5. Idempotency key: {provider}:{event.id}:{event.type} stored in api_idempotency_keys
6. On duplicate key: log and return (do not reprocess)

STRIPE: stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET)
PAYSTACK: HMAC-SHA512(rawBody, PAYSTACK_WEBHOOK_SECRET) must equal x-paystack-signature header

## STRIPE EVENT MAPPING
payment_intent.succeeded → status=SUCCEEDED. If FEATURED_SUBSCRIPTION: create WorkerFeaturedSubscription, set isFeatured=true, emit FEATURE_SUBSCRIPTION_STARTED
payment_intent.payment_failed → status=FAILED, notify user
payment_intent.canceled → status=CANCELLED
charge.refunded → status=REFUNDED. If featured sub: status=CANCELLED, isFeatured=false

## SUBSCRIPTION EXPIRY JOB (every 15 min)
Find: worker_featured_subscriptions WHERE status=ACTIVE AND ends_at < NOW()
Action: status=EXPIRED, worker_profiles.isFeatured=false, notify worker
Warning: find subscriptions WHERE ends_at < NOW() + 7 days AND status=ACTIVE AND warning_sent=false
Action: send FEATURED_EXPIRING notification (once per subscription)

## ENDPOINTS (6)
POST /api/v1/billing/payment-intents
GET  /api/v1/billing/payment-intents/:paymentIntentId
POST /api/v1/billing/payment-intents/:paymentIntentId/confirm
POST /api/v1/billing/webhooks/provider
GET  /api/v1/billing/subscriptions/me
GET  /api/v1/billing/invoices/me

---
# MODULE: support
# File: src/modules/support/

## PRISMA MODELS
```prisma
model SupportTicket {
  id                  String              @id @default(uuid())
  openedByUserId      String
  relatedEntityType   String?             // booking|service_request|user|worker|payment
  relatedEntityId     String?
  status              SupportTicketStatus @default(OPEN)
  priority            SupportPriority     @default(MEDIUM)
  subject             String              // max 180 chars
  body                String
  assignedSupportUserId String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@index([status, priority])
}
model SupportTicketMessage {
  id              String   @id @default(uuid())
  supportTicketId String
  authorUserId    String
  body            String
  isInternalNote  Boolean  @default(false)
  createdAt       DateTime @default(now())
  @@index([supportTicketId, createdAt])
}
enum SupportTicketStatus { OPEN ASSIGNED WAITING_USER WAITING_INTERNAL RESOLVED CLOSED }
enum SupportPriority     { LOW MEDIUM HIGH URGENT }
```

## ENDPOINTS (5)
POST   /api/v1/support/tickets
GET    /api/v1/support/tickets
GET    /api/v1/support/tickets/:ticketId
POST   /api/v1/support/tickets/:ticketId/messages
PATCH  /api/v1/support/tickets/:ticketId

## AUTO-CLOSE JOB (daily)
Find: support_tickets WHERE status=RESOLVED AND updated_at < NOW() - SUPPORT_TICKET_AUTO_CLOSE_DAYS
Set status=CLOSED. Config: support_ticket_auto_close_days (system_config, default 7)

## SEED FIXTURE
Ticket: id=ffffffff-0007-4000-f000-000000000007, opened by Alice, status=OPEN, priority=MEDIUM

---
# MODULE: analytics
# File: src/modules/analytics/

## PRISMA MODELS
```prisma
model AnalyticsEvent {
  id         String   @id @default(uuid())
  userId     String?
  sessionId  String?
  eventName  String   // max 120 chars
  entityType String?
  entityId   String?
  propsJson  Json
  createdAt  DateTime @default(now())
  // PARTITION BY RANGE (created_at) — monthly partitions at 50M rows
  @@index([eventName, createdAt])
  @@index([userId, createdAt])
}
model SearchImpression {
  id              String   @id @default(uuid())
  userId          String?
  queryText       String?
  workerProfileId String?
  rankPosition    Int
  cityId          String?
  createdAt       DateTime @default(now())
  @@index([workerProfileId, createdAt])
}
```

## ENDPOINTS (2 internal)
POST /api/v1/internal/analytics/events  — batch event ingestion (max 100 per call)
POST /api/v1/internal/jobs/run          — manually trigger background jobs

## ANALYTICS ROLLUP JOB (hourly)
Aggregate analytics_events into hourly summary rows for admin dashboard.
Idempotent: uses created_at time window, safe to re-run.

## BATCH EVENT SCHEMA
```typescript
export const BatchEventsBody = z.object({
  events: z.array(z.object({
    eventName:  z.string().min(1).max(120),
    entityType: z.string().max(50).optional(),
    entityId:   z.string().uuid().optional(),
    sessionId:  z.string().uuid().optional(),
    propsJson:  z.record(z.unknown()).default({}),
  })).min(1).max(100),
}).strict();
```

---
# MODULE: admin
# File: src/modules/admin/

## PERMISSION CHECK PATTERN (apply to every admin endpoint)
```typescript
// Middleware: requirePermission('USER_SUSPEND')
const requirePermission = (permissionKey: string) => async (req, res, next) => {
  const actor = req.actor; // set by auth middleware
  const hasPermission = await adminService.checkPermission(actor.userId, permissionKey);
  if (!hasPermission) throw new ApiError('PERMISSION_DENIED', 403);
  // For SUPER_ADMIN: FULL_ACCESS permission bypasses all specific permission checks
  next();
};
```

## ADMIN ENDPOINTS (43) — grouped by permission required
USER_VIEW:                  GET /admin/users, GET /admin/users/:userId
USER_SUSPEND:               POST /admin/users/:userId/suspend
USER_REACTIVATE:            POST /admin/users/:userId/reactivate
WORKER_VIEW:                GET /admin/workers, GET /admin/workers/:workerId
WORKER_VERIFY:              POST /admin/workers/:workerId/verify
WORKER_REJECT_VERIFICATION: POST /admin/workers/:workerId/reject-verification
POST_DELETE:                DELETE /admin/posts/:postId
COMMENT_DELETE:             DELETE /admin/comments/:commentId
REVIEW_DELETE:              DELETE /admin/reviews/:reviewId
REPORT_VIEW:                GET /admin/reports, GET /admin/moderation-cases, GET /admin/moderation-cases/:caseId
MODERATION_CASE_ACTION:     POST /admin/moderation-cases/:caseId/actions
SUPPORT_TICKET_VIEW:        GET /admin/support-tickets
SUPPORT_TICKET_ASSIGN:      PATCH /admin/support-tickets/:ticketId/assign, PATCH .../status
AUDIT_LOG_VIEW:             GET /admin/audit-logs
ANALYTICS_VIEW_OVERVIEW:    GET /admin/analytics/overview
ANALYTICS_VIEW_SEARCH:      GET /admin/analytics/search
ANALYTICS_VIEW_ENGAGEMENT:  GET /admin/analytics/engagement
CONFIG_VIEW/UPDATE:         GET/PATCH /admin/configs/:configKey
FEATURE_FLAG_VIEW/UPDATE:   GET/PATCH /admin/feature-flags/:flagKey
CITY_VIEW/CREATE/UPDATE:    GET/POST/PATCH /admin/cities/:cityId
ROLE_VIEW:                  GET /admin/roles, GET /admin/permissions
ROLE_PERMISSION_UPDATE:     PATCH /admin/roles/:roleId/permissions
ADMIN_ROLE_ASSIGN:          POST /admin/users/:userId/roles
ADMIN_ROLE_REMOVE:          DELETE /admin/users/:userId/roles/:roleId

## MFA REQUIREMENT FOR DANGEROUS ACTIONS
These permission keys additionally require mfa_verified=true in the session:
USER_SUSPEND, WORKER_VERIFY, CONFIG_UPDATE, ADMIN_ROLE_ASSIGN, ADMIN_ROLE_REMOVE

## AUDIT LOG (write to admin_audit_logs after every successful admin action)
{ adminUserId, action: 'WORKER_VERIFIED'|'USER_SUSPENDED'|..., entityType, entityId, metadataJson: { before, after } }

## ADMIN ZOD SCHEMAS
```typescript
export const SuspendUserBody    = z.object({ reason: z.string().min(5).max(500) }).strict();
export const VerifyWorkerBody   = z.object({ notes: z.string().max(1000).optional() }).strict();
export const RejectVerifBody    = z.object({ reviewNotes: z.string().min(10).max(1000) }).strict();
export const UpdateConfigBody   = z.object({ value: z.unknown() }).strict();
export const UpdateFlagBody     = z.object({ defaultEnabled: z.boolean().optional(), rolloutJson: z.record(z.unknown()).optional() }).strict();
export const AssignRoleBody     = z.object({ roleKey: z.enum(['MODERATOR','SUPPORT','ADMIN','SUPER_ADMIN']) }).strict();
export const AddCasActionBody   = z.object({
  actionType: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
  entityId:   z.string().uuid(),
  notes:      z.string().max(2000).optional(),
}).strict();
```

## CACHING
Worker profile public read: Redis key=worker:pub:{workerId}, TTL=120s
Bust on: profile update, review write, moderation action, verification change
Feature flags: Redis key=ff:{flagKey}, TTL=60s, bust on admin update
