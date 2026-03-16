/**
 * src/validation/schemas.ts
 * Vocational Services Platform — Complete Zod Schema Catalog
 *
 * Every request body, query param set, and path param group is defined here.
 * Import the relevant schema in each route handler and call .parse() before
 * passing to the service layer.
 *
 * Convention:
 *   Body schemas:  <Resource><Action>Body  e.g. CreateServiceRequestBody
 *   Query schemas: <Resource><Action>Query  e.g. SearchWorkersQuery
 *   Param schemas: <Resource>Params         e.g. BookingParams
 */

import { z } from 'zod';

// ─── COMMON PRIMITIVES ────────────────────────────────────────────────────────

export const UUIDSchema = z.string().uuid('Must be a valid UUID v4');
export const PaginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const LatSchema = z.coerce.number().min(-90).max(90);
export const LngSchema = z.coerce.number().min(-180).max(180);
export const IdempotencyKeySchema = z.string().min(1).max(255).optional();

// ISO 8601 datetime string that parses to Date
const DateTimeSchema = z.string().datetime({ message: 'Must be ISO 8601 datetime string' });

// Phone normalised to E.164 format
const PhoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Must be E.164 format e.g. +233201234567');

// Email — normalised to lowercase by service layer
const EmailSchema = z.string().email().max(255).transform(v => v.toLowerCase());

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const RegisterBody = z.object({
  email:     EmailSchema.optional(),
  phone:     PhoneSchema.optional(),
  password:  z.string().min(8, 'Min 8 characters').max(128).regex(/[A-Z]/, 'Requires uppercase').regex(/[0-9]/, 'Requires digit').optional(),
  firstName: z.string().min(1).max(100).trim(),
  lastName:  z.string().min(1).max(100).trim(),
}).strict().refine(d => d.email || d.phone, { message: 'Either email or phone is required' })
  .refine(d => (d.email || d.phone) && d.password !== undefined || !d.password, {
    message: 'Password required when registering with email or phone',
  });

export const LoginBody = z.object({
  email:    EmailSchema.optional(),
  phone:    PhoneSchema.optional(),
  password: z.string().min(1).max(128),
}).strict().refine(d => d.email || d.phone, { message: 'Email or phone required' });

export const RefreshBody = z.object({ refreshToken: z.string().min(1) }).strict();

export const RequestPasswordResetBody = z.object({
  email: EmailSchema.optional(),
  phone: PhoneSchema.optional(),
}).strict().refine(d => d.email || d.phone, { message: 'Email or phone required' });

export const ResetPasswordBody = z.object({
  token:       z.string().min(1),
  newPassword: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/),
}).strict();

export const VerifyEmailBody = z.object({ token: z.string().min(1) }).strict();

export const VerifyPhoneBody = z.object({ otp: z.string().length(6).regex(/^\d{6}$/, 'Must be 6 digits') }).strict();

export const RevokeSessionBody = z.object({ sessionId: UUIDSchema }).strict();

export const MFASetupVerifyBody = z.object({ totpCode: z.string().length(6).regex(/^\d{6}$/) }).strict();

export const MFAChallengeBody = z.object({
  method: z.enum(['totp', 'sms', 'backup_code']),
  code:   z.string().min(6).max(12),
}).strict();

// ─── USERS ───────────────────────────────────────────────────────────────────

export const UpdateUserMeBody = z.object({
  firstName:   z.string().min(1).max(100).trim().optional(),
  lastName:    z.string().min(1).max(100).trim().optional(),
  displayName: z.string().max(150).trim().optional().nullable(),
  bio:         z.string().max(3000).optional().nullable(),
  cityId:      UUIDSchema.optional().nullable(),
  lat:         LatSchema.optional().nullable(),
  lng:         LngSchema.optional().nullable(),
}).strict();

export const UpdateNotificationPreferencesBody = z.object({
  chatPushEnabled:    z.boolean().optional(),
  requestPushEnabled: z.boolean().optional(),
  marketingEmailEnabled: z.boolean().optional(),
  quietHoursStart:    z.number().int().min(0).max(23).optional().nullable(),
  quietHoursEnd:      z.number().int().min(0).max(23).optional().nullable(),
}).strict();

export const AddFollowBody = z.object({
  targetType: z.enum(['USER', 'WORKER']),
  targetId:   UUIDSchema,
}).strict();

export const FollowParams = z.object({
  targetType: z.enum(['USER', 'WORKER']),
  targetId:   UUIDSchema,
});

export const UserIdParams = z.object({ userId: UUIDSchema });

// ─── WORKER PROFILES ─────────────────────────────────────────────────────────

export const CreateWorkerProfileBody = z.object({
  headline:        z.string().max(120).trim().optional(),
  bio:             z.string().max(3000).optional(),
  experienceYears: z.number().int().min(0).max(60).default(0),
}).strict();

export const UpdateWorkerProfileBody = z.object({
  headline:        z.string().max(120).trim().optional(),
  bio:             z.string().max(3000).optional().nullable(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  serviceRadiusKm: z.number().int().min(1).max(100).optional(),
}).strict();

export const WorkerIdParams = z.object({ workerId: UUIDSchema });

export const AddTradeBody = z.object({ tradeCategoryId: UUIDSchema }).strict();
export const TradeIdParams = z.object({ tradeId: UUIDSchema });

export const CreateWorkerServiceBody = z.object({
  title:          z.string().min(1).max(150).trim(),
  description:    z.string().max(2000).optional(),
  basePriceMinor: z.number().int().min(0).optional().nullable(),
  currencyCode:   z.string().length(3).toUpperCase().optional().nullable(),
  isEnabled:      z.boolean().default(true),
}).strict();

export const UpdateWorkerServiceBody = CreateWorkerServiceBody.partial();
export const ServiceIdParams = z.object({ serviceId: UUIDSchema });

export const CreateServiceAreaBody = z.object({
  cityId:       UUIDSchema.optional(),
  centerLat:    LatSchema.optional(),
  centerLng:    LngSchema.optional(),
  radiusKm:     z.number().int().min(1).max(100).default(10),
  coverageMode: z.enum(['CIRCLE']).default('CIRCLE'),
}).strict().refine(
  d => (d.cityId !== undefined) || (d.centerLat !== undefined && d.centerLng !== undefined),
  { message: 'Either cityId or centerLat+centerLng must be provided' }
);
export const UpdateServiceAreaBody = CreateServiceAreaBody.partial();
export const AreaIdParams = z.object({ areaId: UUIDSchema });

export const CreateAvailabilityRuleBody = z.object({
  dayOfWeek:  z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1439),
  endMinute:   z.number().int().min(1).max(1440),
  timezone:    z.string().min(1).max(64),
}).strict().refine(d => d.startMinute < d.endMinute, { message: 'startMinute must be before endMinute' });

export const UpdateAvailabilityRuleBody = CreateAvailabilityRuleBody.partial();
export const RuleIdParams = z.object({ ruleId: UUIDSchema });

export const CreateAvailabilityExceptionBody = z.object({
  startsAt: DateTimeSchema,
  endsAt:   DateTimeSchema,
  reason:   z.string().max(255).optional(),
}).strict().refine(d => new Date(d.startsAt) < new Date(d.endsAt), { message: 'startsAt must be before endsAt' });

export const UpdateAvailabilityExceptionBody = CreateAvailabilityExceptionBody.partial();
export const ExceptionIdParams = z.object({ exceptionId: UUIDSchema });

export const CreatePortfolioItemBody = z.object({
  title:     z.string().max(150).trim().optional(),
  caption:   z.string().max(1000).optional(),
  mediaRef:  z.string().min(1), // media upload ref from signed URL flow
  sortOrder: z.number().int().min(0).default(0),
}).strict();
export const UpdatePortfolioItemBody = CreatePortfolioItemBody.partial();
export const PortfolioItemIdParams = z.object({ itemId: UUIDSchema });

export const CreateCertificationBody = z.object({
  title:          z.string().min(1).max(200).trim(),
  issuer:         z.string().max(200).optional(),
  mediaRef:       z.string().min(1), // from media upload flow
  issuedOn:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  expiresOn:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional().nullable(),
}).strict();
export const UpdateCertificationBody = CreateCertificationBody.partial();
export const CertIdParams = z.object({ certId: UUIDSchema });

export const SubmitVerificationBody = z.object({
  documentRefs: z.array(z.string().min(1)).min(1, 'At least one document required').max(5),
  notes:        z.string().max(1000).optional(),
}).strict();

// ─── SEARCH & DISCOVERY ───────────────────────────────────────────────────────

export const SearchWorkersQuery = z.object({
  lat:             LatSchema,
  lng:             LngSchema,
  radiusKm:        z.coerce.number().int().min(1).max(100).optional(),
  tradeCategoryId: UUIDSchema.optional(),
  cityId:          UUIDSchema.optional(),
  minRating:       z.coerce.number().min(0).max(5).optional(),
  isFeatured:      z.coerce.boolean().optional(),
  q:               z.string().max(200).optional(),
}).merge(PaginationSchema);

export const MapSearchWorkersQuery = z.object({
  neLat: LatSchema,
  neLng: LngSchema,
  swLat: LatSchema,
  swLng: LngSchema,
  tradeCategoryId: UUIDSchema.optional(),
}).merge(PaginationSchema);

export const NearbyWorkersQuery = z.object({
  lat:             LatSchema,
  lng:             LngSchema,
  radiusKm:        z.coerce.number().int().min(1).max(100).default(10),
  tradeCategoryId: UUIDSchema.optional(),
}).merge(PaginationSchema);

export const SearchSuggestionsQuery = z.object({ q: z.string().min(1).max(100) });

export const LogImpressionBody = z.object({
  workerProfileId: UUIDSchema,
  rankPosition:    z.number().int().min(1),
  queryText:       z.string().max(255).optional(),
  cityId:          UUIDSchema.optional(),
}).strict();

// ─── SOCIAL FEED ──────────────────────────────────────────────────────────────

export const CreatePostBody = z.object({
  body:       z.string().min(1).max(3000).trim(),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS', 'PRIVATE']).default('PUBLIC'),
  mediaRefs:  z.array(z.string().min(1)).max(10).optional(),
}).strict();

export const UpdatePostBody = z.object({
  body:       z.string().min(1).max(3000).trim().optional(),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS', 'PRIVATE']).optional(),
}).strict();

export const PostIdParams = z.object({ postId: UUIDSchema });

export const GetFeedQuery = z.object({
  since: DateTimeSchema.optional(),
}).merge(PaginationSchema);

export const AddPostMediaBody = z.object({
  mediaRef:  z.string().min(1),
  mediaType: z.enum(['image', 'video']),
}).strict();
export const MediaIdParams = z.object({ postId: UUIDSchema, mediaId: UUIDSchema });

export const CreateCommentBody = z.object({
  body:            z.string().min(1).max(1000).trim(),
  parentCommentId: UUIDSchema.optional(),
}).strict();
export const UpdateCommentBody = z.object({ body: z.string().min(1).max(1000).trim() }).strict();
export const CommentIdParams = z.object({ commentId: UUIDSchema });
export const GetCommentsQuery = PaginationSchema;

export const ReportCommentBody = z.object({
  reason:   z.string().min(5).max(255),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
}).strict();

// ─── CHAT ────────────────────────────────────────────────────────────────────

export const CreateConversationBody = z.object({
  type:             z.enum(['DIRECT', 'SERVICE_REQUEST', 'SUPPORT']),
  participantIds:   z.array(UUIDSchema).min(1).max(10),
  serviceRequestId: UUIDSchema.optional(),
}).strict().refine(
  d => d.type !== 'SERVICE_REQUEST' || d.serviceRequestId !== undefined,
  { message: 'serviceRequestId required for SERVICE_REQUEST conversation type' }
);

export const ConversationIdParams = z.object({ conversationId: UUIDSchema });
export const ConversationParticipantParams = z.object({ conversationId: UUIDSchema, userId: UUIDSchema });

export const GetMessagesQuery = z.object({
  before:  UUIDSchema.optional(), // cursor — messageId to paginate before
  after:   UUIDSchema.optional(), // cursor — messageId to paginate after
}).merge(PaginationSchema);

export const SendMessageBody = z.object({
  clientMessageId:     UUIDSchema,
  messageType:         z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM']),
  body:                z.string().min(1).max(10000).optional(),
  attachmentUploadRefs: z.array(z.string().min(1)).max(5).optional(),
}).strict().refine(
  d => d.messageType === 'TEXT' ? !!d.body : true,
  { message: 'body is required for TEXT messages' }
);

export const AddParticipantBody = z.object({ userId: UUIDSchema }).strict();
export const MarkReadBody = z.object({ lastReadMessageId: UUIDSchema }).strict();
export const MessageIdParams = z.object({ messageId: UUIDSchema });
export const ReportMessageBody = z.object({ reason: z.string().min(5).max(255) }).strict();

// ─── SERVICE REQUESTS ─────────────────────────────────────────────────────────

export const CreateServiceRequestBody = z.object({
  tradeCategoryId:          UUIDSchema.optional(),
  preferredWorkerProfileId: UUIDSchema.optional(),
  title:                    z.string().min(5).max(200).trim(),
  description:              z.string().min(10).max(5000),
  locationText:             z.string().max(255).optional(),
  lat:                      LatSchema.optional(),
  lng:                      LngSchema.optional(),
  scheduledAt:              DateTimeSchema.optional(),
  items: z.array(z.object({
    label:    z.string().min(1).max(150).trim(),
    quantity: z.number().int().min(1).max(999).default(1),
    note:     z.string().max(500).optional(),
  })).max(20).optional(),
}).strict().refine(
  d => !d.scheduledAt || new Date(d.scheduledAt) > new Date(),
  { message: 'scheduledAt must be a future date' }
);

export const UpdateServiceRequestBody = z.object({
  title:        z.string().min(5).max(200).trim().optional(),
  description:  z.string().min(10).max(5000).optional(),
  locationText: z.string().max(255).optional().nullable(),
  lat:          LatSchema.optional().nullable(),
  lng:          LngSchema.optional().nullable(),
  scheduledAt:  DateTimeSchema.optional().nullable(),
}).strict();

export const RequestIdParams = z.object({ requestId: UUIDSchema });
export const AssignmentIdParams = z.object({ requestId: UUIDSchema, assignmentId: UUIDSchema });

export const AddRequestItemBody = z.object({
  label:    z.string().min(1).max(150).trim(),
  quantity: z.number().int().min(1).max(999).default(1),
  note:     z.string().max(500).optional(),
}).strict();
export const RequestItemParams = z.object({ requestId: UUIDSchema, itemId: UUIDSchema });

export const CancelRequestBody = z.object({ reason: z.string().max(255).optional() }).strict();
export const GetRequestsQuery = z.object({
  status: z.enum(['OPEN','MATCHED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED','EXPIRED']).optional(),
}).merge(PaginationSchema);

// ─── BOOKINGS ────────────────────────────────────────────────────────────────

export const CreateBookingBody = z.object({
  serviceRequestId: UUIDSchema,
  scheduledStart:   DateTimeSchema,
  scheduledEnd:     DateTimeSchema,
}).strict().refine(
  d => new Date(d.scheduledStart) < new Date(d.scheduledEnd),
  { message: 'scheduledStart must be before scheduledEnd' }
).refine(
  d => new Date(d.scheduledStart) > new Date(),
  { message: 'scheduledStart must be in the future' }
);

export const BookingIdParams = z.object({ bookingId: UUIDSchema });

export const RescheduleBookingBody = z.object({
  newStart: DateTimeSchema,
  newEnd:   DateTimeSchema,
  reason:   z.string().max(500).optional(),
}).strict().refine(
  d => new Date(d.newStart) < new Date(d.newEnd),
  { message: 'newStart must be before newEnd' }
).refine(
  d => new Date(d.newStart) > new Date(),
  { message: 'newStart must be in the future' }
);

export const RescheduleResponseBody = z.object({
  action: z.enum(['ACCEPT', 'DECLINE']),
  reason: z.string().max(500).optional(),
}).strict();
export const RescheduleIdParams = z.object({ bookingId: UUIDSchema, rescheduleId: UUIDSchema });

export const CancelBookingBody = z.object({ reason: z.string().max(255).optional() }).strict();
export const ConfirmBookingBody = z.object({ notes: z.string().max(500).optional() }).strict();
export const CompleteBookingBody = z.object({ notes: z.string().max(500).optional() }).strict();

export const GetBookingsQuery = z.object({
  status: z.enum(['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','RESCHEDULED']).optional(),
  from:   DateTimeSchema.optional(),
  to:     DateTimeSchema.optional(),
}).merge(PaginationSchema);

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

export const CreateReviewBody = z.object({
  bookingId:  UUIDSchema,
  rating:     z.number().int().min(1).max(5),
  body:       z.string().max(2000).optional(),
  dimensions: z.array(z.object({
    dimensionKey: z.enum(['quality', 'communication', 'punctuality', 'value']),
    score:        z.number().int().min(1).max(5),
  })).max(4).optional(),
}).strict();

export const ReviewIdParams = z.object({ reviewId: UUIDSchema });

export const AddDimensionsBody = z.object({
  dimensions: z.array(z.object({
    dimensionKey: z.enum(['quality', 'communication', 'punctuality', 'value']),
    score:        z.number().int().min(1).max(5),
  })).min(1).max(4),
}).strict();

export const CreateReviewReplyBody = z.object({ body: z.string().min(1).max(1000).trim() }).strict();
export const UpdateReviewReplyBody = z.object({ body: z.string().min(1).max(1000).trim() }).strict();
export const ReplyIdParams = z.object({ reviewId: UUIDSchema, replyId: UUIDSchema });
export const GetWorkerReviewsParams = z.object({ workerId: UUIDSchema });
export const GetWorkerReviewsQuery = z.object({
  minRating: z.coerce.number().int().min(1).max(5).optional(),
}).merge(PaginationSchema);

export const ReportReviewBody = z.object({
  reason:   z.string().min(5).max(255),
  severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
}).strict();

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const GetNotificationsQuery = z.object({
  isRead:  z.coerce.boolean().optional(),
  channel: z.enum(['IN_APP','PUSH','EMAIL','SMS']).optional(),
}).merge(PaginationSchema);
export const NotificationIdParams = z.object({ notificationId: UUIDSchema });

export const RegisterPushDeviceBody = z.object({
  deviceToken: z.string().min(1).max(255),
  platform:    z.enum(['ios', 'android', 'web']),
}).strict();
export const DeviceIdParams = z.object({ deviceId: UUIDSchema });

// ─── BILLING ─────────────────────────────────────────────────────────────────

export const CreatePaymentIntentBody = z.object({
  type:       z.enum(['FEATURED_SUBSCRIPTION', 'BOOST']),
  bookingId:  UUIDSchema.optional(),
  durationDays: z.number().int().min(7).max(365).optional(),
  currencyCode: z.string().length(3).toUpperCase().optional(),
}).strict();

export const PaymentIntentIdParams = z.object({ paymentIntentId: UUIDSchema });
export const ConfirmPaymentIntentBody = z.object({ providerRef: z.string().min(1).max(255) }).strict();

// Webhook — no Zod parse (raw body needed for HMAC); validated in middleware

// ─── SUPPORT ──────────────────────────────────────────────────────────────────

export const CreateSupportTicketBody = z.object({
  subject:           z.string().min(5).max(180).trim(),
  body:              z.string().min(10).max(10000),
  priority:          z.enum(['LOW','MEDIUM','HIGH','URGENT']).default('MEDIUM'),
  relatedEntityType: z.enum(['booking','service_request','user','worker','payment']).optional(),
  relatedEntityId:   UUIDSchema.optional(),
}).strict().refine(
  d => !d.relatedEntityId || d.relatedEntityType !== undefined,
  { message: 'relatedEntityType required when relatedEntityId is provided' }
);

export const TicketIdParams = z.object({ ticketId: UUIDSchema });
export const AddTicketMessageBody = z.object({
  body:           z.string().min(1).max(10000),
  isInternalNote: z.boolean().default(false),
}).strict();
export const UpdateTicketBody = z.object({
  status: z.enum(['OPEN','ASSIGNED','WAITING_USER','WAITING_INTERNAL','RESOLVED','CLOSED']).optional(),
}).strict();

// ─── MEDIA UPLOAD ─────────────────────────────────────────────────────────────

export const RequestUploadUrlBody = z.object({
  category: z.enum(['avatar','portfolio_image','portfolio_video','post_image','post_video','certification','chat_attachment','verification_doc']),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().min(1).max(209715200), // 200 MB hard max
  filename:  z.string().max(255).optional(),
}).strict();

export const ConfirmUploadBody = z.object({ mediaId: UUIDSchema }).strict();

// ─── ADMIN ───────────────────────────────────────────────────────────────────

export const AdminListUsersQuery = z.object({
  status:  z.enum(['ACTIVE','SUSPENDED','DELETED']).optional(),
  q:       z.string().max(200).optional(),
  cityId:  UUIDSchema.optional(),
}).merge(PaginationSchema);

export const AdminUserIdParams = z.object({ userId: UUIDSchema });
export const SuspendUserBody = z.object({ reason: z.string().min(5).max(500) }).strict();
export const ReactivateUserBody = z.object({ notes: z.string().max(500).optional() }).strict();

export const AdminListWorkersQuery = z.object({
  verificationStatus: z.enum(['DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','EXPIRED']).optional(),
  q:                  z.string().max(200).optional(),
}).merge(PaginationSchema);

export const VerifyWorkerBody = z.object({ notes: z.string().max(1000).optional() }).strict();
export const RejectVerificationBody = z.object({ reviewNotes: z.string().min(10).max(1000) }).strict();
export const AdminWorkerIdParams = z.object({ workerId: UUIDSchema });

export const AdminListReportsQuery = z.object({
  status:     z.enum(['OPEN','UNDER_REVIEW','RESOLVED','DISMISSED']).optional(),
  entityType: z.string().max(50).optional(),
  severity:   z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
}).merge(PaginationSchema);

export const AdminListModerationCasesQuery = z.object({
  status: z.enum(['OPEN','IN_REVIEW','ACTIONED','DISMISSED','CLOSED']).optional(),
}).merge(PaginationSchema);
export const ModerationCaseIdParams = z.object({ caseId: UUIDSchema });
export const AddModerationActionBody = z.object({
  actionType:  z.string().min(1).max(100),
  entityType:  z.string().min(1).max(50),
  entityId:    UUIDSchema,
  notes:       z.string().max(2000).optional(),
}).strict();

export const AdminListSupportTicketsQuery = z.object({
  status:   z.enum(['OPEN','ASSIGNED','WAITING_USER','WAITING_INTERNAL','RESOLVED','CLOSED']).optional(),
  priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),
}).merge(PaginationSchema);
export const AssignTicketBody = z.object({ assignedSupportUserId: UUIDSchema }).strict();
export const UpdateTicketStatusBody = z.object({
  status: z.enum(['OPEN','ASSIGNED','WAITING_USER','WAITING_INTERNAL','RESOLVED','CLOSED']),
}).strict();

export const UpdateConfigBody = z.object({ value: z.unknown() }).strict();
export const ConfigKeyParams = z.object({ configKey: z.string().min(1).max(120) });

export const UpdateFeatureFlagBody = z.object({
  defaultEnabled: z.boolean().optional(),
  rolloutJson:    z.record(z.unknown()).optional(),
}).strict();
export const FlagKeyParams = z.object({ flagKey: z.string().min(1).max(120) });

export const CreateCityBody = z.object({
  slug:                 z.string().min(1).max(120).regex(/^[a-z0-9_]+$/, 'Lowercase alphanumeric and underscore only'),
  name:                 z.string().min(1).max(120),
  countryCode:          z.string().length(2).toUpperCase(),
  currencyCode:         z.string().length(3).toUpperCase(),
  timezone:             z.string().min(1).max(64),
  defaultSearchRadiusKm: z.number().int().min(1).max(100).default(10),
  isEnabled:            z.boolean().default(false),
}).strict();
export const UpdateCityBody = CreateCityBody.partial();
export const CityIdParams = z.object({ cityId: UUIDSchema });

export const UpdateRolePermissionsBody = z.object({
  permissionKeys: z.array(z.string().min(1)).min(0).max(50),
}).strict();
export const RoleIdParams = z.object({ roleId: UUIDSchema });

export const AssignAdminRoleBody = z.object({ roleKey: z.enum(['MODERATOR','SUPPORT','ADMIN','SUPER_ADMIN']) }).strict();
export const RemoveAdminRoleParams = z.object({ userId: UUIDSchema, roleId: UUIDSchema });

export const AdminAuditLogQuery = z.object({
  action:      z.string().max(100).optional(),
  entityType:  z.string().max(50).optional(),
  entityId:    UUIDSchema.optional(),
  adminUserId: UUIDSchema.optional(),
  from:        DateTimeSchema.optional(),
  to:          DateTimeSchema.optional(),
}).merge(PaginationSchema);

// ─── ANALYTICS (INTERNAL) ────────────────────────────────────────────────────

export const BatchAnalyticsEventsBody = z.object({
  events: z.array(z.object({
    eventName:  z.string().min(1).max(120),
    entityType: z.string().max(50).optional(),
    entityId:   UUIDSchema.optional(),
    sessionId:  UUIDSchema.optional(),
    propsJson:  z.record(z.unknown()).default({}),
  })).min(1).max(100),
}).strict();

export const TriggerJobBody = z.object({
  jobName: z.enum(['notification_fanout','analytics_rollup','subscription_expiry_check','fraud_signal_evaluator','search_reindex_full','audit_integrity_check','token_cleanup']),
  payload: z.record(z.unknown()).optional(),
}).strict();
