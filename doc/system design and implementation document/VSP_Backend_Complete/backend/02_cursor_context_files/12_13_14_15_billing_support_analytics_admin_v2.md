# MODULE: admin (UPDATED v2 — includes new endpoints from admin frontend integration)
# File: src/modules/admin/
# Replaces the admin section of: 12_13_14_15_billing_support_analytics_admin.md

## TOTAL ADMIN ENDPOINTS: 43 original + 22 new = 65 admin-scoped endpoints

## ALL PERMISSIONS (original 32 + 9 new = 41 total)
```
USER_VIEW, USER_SUSPEND, USER_REACTIVATE
WORKER_VIEW, WORKER_VERIFY, WORKER_REJECT_VERIFICATION
POST_DELETE, COMMENT_DELETE, REVIEW_DELETE
REPORT_VIEW, MODERATION_CASE_ASSIGN, MODERATION_CASE_ACTION
SUPPORT_TICKET_VIEW, SUPPORT_TICKET_ASSIGN, SUPPORT_TICKET_RESPOND
AUDIT_LOG_VIEW
ANALYTICS_VIEW_OVERVIEW, ANALYTICS_VIEW_SEARCH, ANALYTICS_VIEW_ENGAGEMENT
CONFIG_VIEW, CONFIG_UPDATE
FEATURE_FLAG_VIEW, FEATURE_FLAG_UPDATE
CITY_VIEW, CITY_CREATE, CITY_UPDATE
ROLE_VIEW, PERMISSION_VIEW, ROLE_PERMISSION_UPDATE
ADMIN_ROLE_ASSIGN, ADMIN_ROLE_REMOVE
FULL_ACCESS

# NEW PERMISSIONS (add to seed.ts and ALL_PERMISSIONS):
SERVICE_REQUEST_VIEW    — View all service requests in admin context
BOOKING_VIEW            — View all bookings in admin context
FEATURED_WORKER_MANAGE  — Manage worker featured subscriptions
FRAUD_SIGNAL_VIEW       — View fraud signals list and details
FRAUD_SIGNAL_ACTION     — Review, dismiss, or action fraud signals
SYSTEM_HEALTH_VIEW      — View admin system health dashboard and metrics
CONTENT_VIEW            — View full content of reported entities
NOTIFICATION_BROADCAST  — Send broadcast notifications to user segments
ANALYTICS_VIEW_MARKETPLACE — View marketplace analytics and booking funnel
```

## PERMISSION CHECK PATTERN (mandatory on every admin endpoint)
```typescript
const requirePermission = (permissionKey: string) => async (req, res, next) => {
  const actor = req.actor;
  // FULL_ACCESS bypasses all individual permission checks (SUPER_ADMIN only)
  const permissions = await adminService.getUserPermissions(actor.userId);
  if (!permissions.includes('FULL_ACCESS') && !permissions.includes(permissionKey)) {
    throw new ApiError('PERMISSION_DENIED', 403);
  }
  next();
};

// MFA check middleware (for dangerous actions)
const requireMFA = (req, res, next) => {
  if (!req.actor.mfaVerified) throw new ApiError('MFA_REQUIRED', 403, 'MFA verification required for this action');
  next();
};
```

## DANGEROUS ACTIONS REQUIRING MFA (in addition to permission check)
USER_SUSPEND, WORKER_VERIFY, WORKER_REJECT_VERIFICATION,
CONFIG_UPDATE, ADMIN_ROLE_ASSIGN, ADMIN_ROLE_REMOVE,
ROLE_PERMISSION_UPDATE, NOTIFICATION_BROADCAST

## FULL ENDPOINT LIST

### Original Endpoints (43)
GET    /api/v1/admin/users                         → USER_VIEW
GET    /api/v1/admin/users/:userId                 → USER_VIEW
POST   /api/v1/admin/users/:userId/suspend         → USER_SUSPEND + MFA
POST   /api/v1/admin/users/:userId/reactivate      → USER_REACTIVATE
GET    /api/v1/admin/workers                       → WORKER_VIEW
GET    /api/v1/admin/workers/:workerId             → WORKER_VIEW
POST   /api/v1/admin/workers/:workerId/verify      → WORKER_VERIFY + MFA
POST   /api/v1/admin/workers/:workerId/reject-verification → WORKER_REJECT_VERIFICATION + MFA
GET    /api/v1/admin/posts                         → POST_DELETE
DELETE /api/v1/admin/posts/:postId                 → POST_DELETE
DELETE /api/v1/admin/comments/:commentId           → COMMENT_DELETE
DELETE /api/v1/admin/reviews/:reviewId             → REVIEW_DELETE
GET    /api/v1/admin/reports                       → REPORT_VIEW
GET    /api/v1/admin/moderation-cases              → REPORT_VIEW
GET    /api/v1/admin/moderation-cases/:caseId      → REPORT_VIEW
POST   /api/v1/admin/moderation-cases/:caseId/actions → MODERATION_CASE_ACTION
GET    /api/v1/admin/support-tickets               → SUPPORT_TICKET_VIEW
PATCH  /api/v1/admin/support-tickets/:ticketId/assign  → SUPPORT_TICKET_ASSIGN
PATCH  /api/v1/admin/support-tickets/:ticketId/status  → SUPPORT_TICKET_ASSIGN
GET    /api/v1/admin/audit-logs                    → AUDIT_LOG_VIEW
GET    /api/v1/admin/analytics/overview            → ANALYTICS_VIEW_OVERVIEW
GET    /api/v1/admin/analytics/search              → ANALYTICS_VIEW_SEARCH
GET    /api/v1/admin/analytics/engagement          → ANALYTICS_VIEW_ENGAGEMENT
GET    /api/v1/admin/configs                       → CONFIG_VIEW
PATCH  /api/v1/admin/configs/:configKey            → CONFIG_UPDATE + MFA
GET    /api/v1/admin/feature-flags                 → FEATURE_FLAG_VIEW
PATCH  /api/v1/admin/feature-flags/:flagKey        → FEATURE_FLAG_UPDATE
GET    /api/v1/admin/cities                        → CITY_VIEW
POST   /api/v1/admin/cities                        → CITY_CREATE
PATCH  /api/v1/admin/cities/:cityId                → CITY_UPDATE
GET    /api/v1/admin/roles                         → ROLE_VIEW
GET    /api/v1/admin/permissions                   → PERMISSION_VIEW
PATCH  /api/v1/admin/roles/:roleId/permissions     → ROLE_PERMISSION_UPDATE + MFA
POST   /api/v1/admin/users/:userId/roles           → ADMIN_ROLE_ASSIGN + MFA
DELETE /api/v1/admin/users/:userId/roles/:roleId   → ADMIN_ROLE_REMOVE + MFA

### NEW Endpoints (22)
GET    /api/v1/admin/service-requests              → SERVICE_REQUEST_VIEW
GET    /api/v1/admin/service-requests/:requestId   → SERVICE_REQUEST_VIEW
GET    /api/v1/admin/bookings                      → BOOKING_VIEW
GET    /api/v1/admin/bookings/:bookingId           → BOOKING_VIEW
GET    /api/v1/admin/featured-workers              → FEATURED_WORKER_MANAGE
PATCH  /api/v1/admin/featured-workers/:workerId    → FEATURED_WORKER_MANAGE
GET    /api/v1/admin/workers/:workerId/verification-documents → WORKER_VERIFY
GET    /api/v1/admin/workers/:workerId/subscription → FEATURED_WORKER_MANAGE
PATCH  /api/v1/admin/workers/:workerId/subscription → FEATURED_WORKER_MANAGE
GET    /api/v1/admin/fraud-signals                 → FRAUD_SIGNAL_VIEW
PATCH  /api/v1/admin/fraud-signals/:signalId       → FRAUD_SIGNAL_ACTION
GET    /api/v1/admin/content/:entityType/:entityId → CONTENT_VIEW
GET    /api/v1/admin/analytics/marketplace         → ANALYTICS_VIEW_MARKETPLACE
GET    /api/v1/admin/system/health                 → SYSTEM_HEALTH_VIEW
GET    /api/v1/admin/system/metrics                → SYSTEM_HEALTH_VIEW
POST   /api/v1/admin/notifications/broadcast       → NOTIFICATION_BROADCAST + MFA
GET    /api/v1/admin/reports/:reportId             → REPORT_VIEW
POST   /api/v1/auth/mfa/setup                      → Authenticated
POST   /api/v1/auth/mfa/verify-setup               → Authenticated
POST   /api/v1/auth/mfa/disable                    → Authenticated + MFA
GET    /api/v1/auth/mfa/backup-codes               → Authenticated + MFA

## NEW ZOD SCHEMAS
```typescript
export const AdminServiceRequestsQuery = z.object({
  status:          z.enum(['OPEN','MATCHED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED','EXPIRED']).optional(),
  tradeCategoryId: z.string().uuid().optional(),
  cityId:          z.string().uuid().optional(),
  customerId:      z.string().uuid().optional(),
  q:               z.string().max(200).optional(),
  from:            z.string().datetime().optional(),
  to:              z.string().datetime().optional(),
  page:            z.coerce.number().int().min(1).default(1),
  limit:           z.coerce.number().int().min(1).max(100).default(20),
});

export const AdminBookingsQuery = z.object({
  status:     z.enum(['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','RESCHEDULED']).optional(),
  workerId:   z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  cityId:     z.string().uuid().optional(),
  from:       z.string().datetime().optional(),
  to:         z.string().datetime().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

export const FeaturedWorkerActionBody = z.object({
  action:  z.enum(['ENABLE','DISABLE','EXTEND']),
  endsAt:  z.string().datetime().optional(),
  notes:   z.string().min(5).max(500),
}).strict().refine(d => d.action !== 'EXTEND' || d.endsAt !== undefined,
  { message: 'endsAt required for EXTEND action' });

export const FraudSignalActionBody = z.object({
  action:           z.enum(['REVIEW','DISMISS','ACTION']),
  notes:            z.string().max(2000).optional(),
  moderationCaseId: z.string().uuid().optional(),
}).strict().refine(d => d.action !== 'ACTION' || !!d.notes,
  { message: 'notes required when actioning a fraud signal' });

export const AdminFraudSignalsQuery = z.object({
  status:    z.enum(['OPEN','REVIEWED','DISMISSED','ACTIONED']).optional(),
  signalKey: z.string().max(120).optional(),
  userId:    z.string().uuid().optional(),
  minScore:  z.coerce.number().min(0).max(100).optional(),
  from:      z.string().datetime().optional(),
  to:        z.string().datetime().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
});

export const ContentViewerParams = z.object({
  entityType: z.enum(['post','comment','review','message']),
  entityId:   z.string().uuid(),
});

export const BroadcastNotificationBody = z.object({
  targetAudience: z.enum(['ALL_USERS','ALL_WORKERS','CITY','TRADE']),
  targetId:       z.string().uuid().optional(),
  title:          z.string().min(5).max(100).trim(),
  body:           z.string().min(10).max(500),
  channel:        z.enum(['IN_APP','PUSH','EMAIL']),
  scheduledAt:    z.string().datetime().optional(),
}).strict().refine(
  d => !['CITY','TRADE'].includes(d.targetAudience) || !!d.targetId,
  { message: 'targetId required for CITY or TRADE audience' }
);

export const MFASetupBody    = z.object({ method: z.enum(['totp','sms']) }).strict();
export const MFAVerifyBody   = z.object({ method: z.enum(['totp','sms']), code: z.string().length(6).regex(/^\d{6}$/) }).strict();
export const MFADisableBody  = z.object({ code: z.string().min(6).max(12), method: z.enum(['totp','sms','backup_code']) }).strict();
```

## SERVICE INTERFACE ADDITIONS
```typescript
interface IAdminService {
  // ... existing methods ...

  // NEW: Marketplace admin
  listServiceRequestsAdmin(params: AdminSRParams, pagination: Pagination): Promise<PaginatedResult<ServiceRequestAdminSummary>>;
  getServiceRequestAdmin(requestId: string): Promise<ServiceRequestAdminDetail>;
  listBookingsAdmin(params: AdminBookingParams, pagination: Pagination): Promise<PaginatedResult<BookingAdminSummary>>;
  getBookingAdmin(bookingId: string): Promise<BookingAdminDetail>;

  // NEW: Featured workers
  listFeaturedWorkers(params: FeaturedWorkersParams, pagination: Pagination): Promise<PaginatedResult<FeaturedWorkerSummary>>;
  actionFeaturedWorker(actor: ActorContext, workerId: string, data: { action: string; endsAt?: Date; notes: string }): Promise<void>;
  getWorkerSubscription(workerId: string): Promise<WorkerSubscriptionDetail>;

  // NEW: Verification documents
  getWorkerVerificationDocuments(workerId: string): Promise<VerificationDocumentsResult>;

  // NEW: Fraud signals
  listFraudSignals(params: FraudSignalParams, pagination: Pagination): Promise<PaginatedResult<FraudSignal>>;
  actionFraudSignal(actor: ActorContext, signalId: string, data: { action: string; notes?: string; moderationCaseId?: string }): Promise<void>;

  // NEW: Content viewer
  getContent(entityType: 'post'|'comment'|'review'|'message', entityId: string): Promise<ContentViewResult>;

  // NEW: Analytics marketplace
  getMarketplaceAnalytics(params: { from?: Date; to?: Date }): Promise<MarketplaceAnalyticsResult>;

  // NEW: System health
  getSystemHealthAdmin(): Promise<AdminSystemHealth>;
  getSystemMetrics(): Promise<SystemMetrics>;

  // NEW: Broadcast
  broadcastNotification(actor: ActorContext, data: BroadcastData): Promise<{ broadcastId: string; estimatedRecipients: number }>;

  // NEW: Report detail
  getReportDetail(reportId: string): Promise<ReportDetail>;
}
```

## NEW PRISMA MODEL
```prisma
model NotificationBroadcast {
  id                  String   @id @default(uuid())
  createdByAdminId    String
  targetAudience      String
  targetId            String?
  title               String
  body                String
  channel             String
  estimatedRecipients Int
  actualRecipients    Int?
  status              String   @default("QUEUED")
  scheduledAt         DateTime?
  completedAt         DateTime?
  createdAt           DateTime @default(now())
  @@index([status, createdAt])
}
```

## BROADCAST JOB (add to BullMQ notifications queue)
Job: notification_broadcast
Payload: { broadcastId: string }
Action:
  1. Load NotificationBroadcast record
  2. Query target users based on targetAudience:
     ALL_USERS: all users WHERE status=ACTIVE
     ALL_WORKERS: all worker_profiles WHERE verificationStatus=APPROVED
     CITY: user_profiles WHERE cityId=targetId AND user.status=ACTIVE
     TRADE: worker_trade_categories WHERE tradeCategoryId=targetId (via worker -> user)
  3. For each batch of 500 users:
     a. Create notification records (IN_APP always)
     b. If channel=PUSH: enqueue push delivery
     c. If channel=EMAIL: enqueue email delivery
  4. Update NotificationBroadcast.actualRecipients and status=COMPLETED
  5. Write admin_audit_log

## CONTENT VIEWER LOGIC
GET /api/v1/admin/content/:entityType/:entityId
Polymorphic handler — routes to correct repository based on entityType:
  post    → find Post with PostMedia[], author UserProfile, likeCount, commentCount, isDeleted flag
  comment → find Comment with author, parentPost summary, isDeleted flag
  review  → find Review with DimensionScores[], booking summary, reviewer, reviewee
  message → find Message with MessageAttachments[], sender, Conversation summary
Throw CONTENT_VIEW (404) if entity not found regardless of type.
All responses include: { entityType, entityId, content: {...}, moderationHistory: ModerationAction[] }

## SYSTEM HEALTH IMPLEMENTATION
GET /api/v1/admin/system/health calls:
  1. prisma.$queryRaw`SELECT 1` → measure latency
  2. redis.ping() → measure latency + redis.info('memory') → memoryUsedMb
  3. typesenseClient.collections('workers').retrieve() → docCount
  4. For each BullMQ queue: queue.getJobCounts() → {waiting, active, completed, failed}
  5. prisma.jobRun.findMany({ take: 20, orderBy: { startedAt: 'desc' } })
  6. redis.get('ws:connections:count') → WebSocket connection count

## AUDIT LOG (write on every admin action — include new actions)
New action types to add to admin_audit_logs:
FEATURED_WORKER_ENABLED, FEATURED_WORKER_DISABLED, FEATURED_WORKER_EXTENDED
FRAUD_SIGNAL_REVIEWED, FRAUD_SIGNAL_DISMISSED, FRAUD_SIGNAL_ACTIONED
NOTIFICATION_BROADCAST_CREATED
WORKER_VERIFICATION_DOCUMENTS_VIEWED
MFA_ENABLED, MFA_DISABLED

## SEED ADDITIONS (add to seed.ts ROLE_PERMISSIONS)
```typescript
// Updated ROLE_PERMISSIONS in seed.ts:
MODERATOR: [
  'USER_VIEW', 'WORKER_VIEW',
  'POST_DELETE', 'COMMENT_DELETE', 'REVIEW_DELETE',
  'REPORT_VIEW', 'MODERATION_CASE_ASSIGN', 'MODERATION_CASE_ACTION',
  'ANALYTICS_VIEW_ENGAGEMENT',
  'FRAUD_SIGNAL_VIEW',   // NEW
  'CONTENT_VIEW',        // NEW
],
SUPPORT: [
  'USER_VIEW', 'WORKER_VIEW',
  'SUPPORT_TICKET_VIEW', 'SUPPORT_TICKET_ASSIGN', 'SUPPORT_TICKET_RESPOND',
],
ADMIN: [
  // ... all existing ADMIN permissions ...
  'SERVICE_REQUEST_VIEW',      // NEW
  'BOOKING_VIEW',              // NEW
  'FEATURED_WORKER_MANAGE',    // NEW
  'FRAUD_SIGNAL_VIEW',         // NEW
  'FRAUD_SIGNAL_ACTION',       // NEW
  'SYSTEM_HEALTH_VIEW',        // NEW
  'CONTENT_VIEW',              // NEW
  'NOTIFICATION_BROADCAST',    // NEW
  'ANALYTICS_VIEW_MARKETPLACE',// NEW
],
SUPER_ADMIN: ['FULL_ACCESS'],
```
