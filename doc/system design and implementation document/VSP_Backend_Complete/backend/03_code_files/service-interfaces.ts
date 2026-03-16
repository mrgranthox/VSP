/**
 * src/modules/service-interfaces.ts
 * Vocational Services Platform — Service Layer Method Signatures
 *
 * Every public method on every service class is declared here.
 * Implementations live in src/modules/<module>/service.ts
 * These signatures are the cross-module contract — do not change names.
 */

import type {
  User, UserProfile, WorkerProfile, WorkerService, WorkerServiceArea,
  WorkerAvailabilityRule, WorkerAvailabilityException, WorkerPortfolioItem,
  WorkerCertification, WorkerVerificationRequest, TradeCategory, CityConfig,
  ServiceRequest, ServiceRequestAssignment, ServiceRequestStatusHistory, Booking,
  BookingReschedule, Review, ReviewDimensionScore, Post, Comment, Conversation,
  Message, Notification, NotificationPreference, PaymentIntent, SupportTicket,
  ModerationCase, Report, AuditLog, FeatureFlag, SystemConfig,
  RequestStatus, BookingStatus, AdminRoleKey
} from '@prisma/client';

// ─── SHARED TYPES ─────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; hasNext: boolean };
}

export interface ServiceResult<T> {
  success: true;
  data: T;
}

// Context passed to all service methods for RBAC and audit
export interface ActorContext {
  userId: string;
  roles?: AdminRoleKey[];
  permissions?: string[];
  mfaVerified?: boolean;
  ipAddress?: string;
}

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface IAuthService {
  register(data: { email?: string; phone?: string; password?: string; firstName: string; lastName: string }): Promise<{ userId: string; status: string }>;
  login(data: { email?: string; phone?: string; password: string }, ipAddress: string, deviceType?: string): Promise<{ tokenPair: TokenPair; userId: string }>;
  logout(actor: ActorContext, sessionId: string): Promise<void>;
  refreshTokens(refreshToken: string): Promise<TokenPair>;
  requestPasswordReset(data: { email?: string; phone?: string }): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  verifyPhone(actor: ActorContext, otp: string): Promise<void>;
  revokeSession(actor: ActorContext, sessionId: string): Promise<void>;
  getMe(actor: ActorContext): Promise<{ user: User; roles: AdminRoleKey[] }>;
  setupMFA(actor: ActorContext, method: 'totp' | 'sms'): Promise<{ secret?: string; qrCodeUrl?: string }>;
  verifyMFASetup(actor: ActorContext, code: string): Promise<{ backupCodes: string[] }>;
  challengeMFA(actor: ActorContext, data: { method: string; code: string }): Promise<{ sessionId: string }>;
}

// ─── USERS SERVICE ────────────────────────────────────────────────────────────

export interface IUsersService {
  getMe(actor: ActorContext): Promise<UserProfile & { user: User }>;
  updateMe(actor: ActorContext, data: Partial<{ firstName: string; lastName: string; displayName: string; bio: string; cityId: string; lat: number; lng: number }>): Promise<UserProfile>;
  getPublicProfile(userId: string): Promise<UserProfile & { user: Pick<User, 'id'> }>;
  deleteMe(actor: ActorContext): Promise<void>; // stages deletion

  // Preferences
  getNotificationPreferences(actor: ActorContext): Promise<NotificationPreference>;
  updateNotificationPreferences(actor: ActorContext, data: Partial<NotificationPreference>): Promise<NotificationPreference>;

  // Saved workers
  getSavedWorkers(actor: ActorContext, pagination: { page: number; limit: number }): Promise<PaginatedResult<WorkerProfile>>;
  saveWorker(actor: ActorContext, workerProfileId: string): Promise<void>;
  unsaveWorker(actor: ActorContext, workerProfileId: string): Promise<void>;

  // Follows
  getFollows(actor: ActorContext, pagination: { page: number; limit: number }): Promise<PaginatedResult<{ targetType: string; targetId: string }>>;
  followTarget(actor: ActorContext, targetType: 'USER' | 'WORKER', targetId: string): Promise<void>;
  unfollowTarget(actor: ActorContext, targetType: 'USER' | 'WORKER', targetId: string): Promise<void>;
}

// ─── WORKER PROFILES SERVICE ──────────────────────────────────────────────────

export interface WorkerProfilePublic extends WorkerProfile {
  tradeCategories: TradeCategory[];
  services: WorkerService[];
  serviceAreas: WorkerServiceArea[];
  portfolioItems: WorkerPortfolioItem[];
  certifications: Pick<WorkerCertification, 'id' | 'title' | 'issuer' | 'issuedOn' | 'expiresOn' | 'verificationStatus'>[];
}

export interface IWorkerProfilesService {
  createProfile(actor: ActorContext, data: { headline?: string; bio?: string; experienceYears?: number }): Promise<WorkerProfile>;
  getMyProfile(actor: ActorContext): Promise<WorkerProfilePublic>;
  updateMyProfile(actor: ActorContext, data: Partial<{ headline: string; bio: string; experienceYears: number; serviceRadiusKm: number }>): Promise<WorkerProfile>;
  getPublicProfile(workerProfileId: string): Promise<WorkerProfilePublic>;

  // Trades
  addTrade(actor: ActorContext, tradeCategoryId: string): Promise<void>;
  removeTrade(actor: ActorContext, tradeId: string): Promise<void>;

  // Services
  createService(actor: ActorContext, data: { title: string; description?: string; basePriceMinor?: number; currencyCode?: string; isEnabled?: boolean }): Promise<WorkerService>;
  updateService(actor: ActorContext, serviceId: string, data: Partial<WorkerService>): Promise<WorkerService>;
  deleteService(actor: ActorContext, serviceId: string): Promise<void>;

  // Service Areas
  createServiceArea(actor: ActorContext, data: { cityId?: string; centerLat?: number; centerLng?: number; radiusKm?: number }): Promise<WorkerServiceArea>;
  updateServiceArea(actor: ActorContext, areaId: string, data: Partial<WorkerServiceArea>): Promise<WorkerServiceArea>;
  deleteServiceArea(actor: ActorContext, areaId: string): Promise<void>;

  // Availability
  createAvailabilityRule(actor: ActorContext, data: { dayOfWeek: number; startMinute: number; endMinute: number; timezone: string }): Promise<WorkerAvailabilityRule>;
  updateAvailabilityRule(actor: ActorContext, ruleId: string, data: Partial<WorkerAvailabilityRule>): Promise<WorkerAvailabilityRule>;
  deleteAvailabilityRule(actor: ActorContext, ruleId: string): Promise<void>;
  createAvailabilityException(actor: ActorContext, data: { startsAt: Date; endsAt: Date; reason?: string }): Promise<WorkerAvailabilityException>;
  updateAvailabilityException(actor: ActorContext, exceptionId: string, data: Partial<WorkerAvailabilityException>): Promise<WorkerAvailabilityException>;
  deleteAvailabilityException(actor: ActorContext, exceptionId: string): Promise<void>;

  // Portfolio
  addPortfolioItem(actor: ActorContext, data: { title?: string; caption?: string; mediaRef: string; sortOrder?: number }): Promise<WorkerPortfolioItem>;
  updatePortfolioItem(actor: ActorContext, itemId: string, data: Partial<WorkerPortfolioItem>): Promise<WorkerPortfolioItem>;
  deletePortfolioItem(actor: ActorContext, itemId: string): Promise<void>;

  // Certifications
  addCertification(actor: ActorContext, data: { title: string; issuer?: string; mediaRef: string; issuedOn?: string; expiresOn?: string }): Promise<WorkerCertification>;
  updateCertification(actor: ActorContext, certId: string, data: Partial<WorkerCertification>): Promise<WorkerCertification>;
  deleteCertification(actor: ActorContext, certId: string): Promise<void>;

  // Verification
  submitVerificationRequest(actor: ActorContext, data: { documentRefs: string[]; notes?: string }): Promise<WorkerVerificationRequest>;

  // Aggregate recalculation (called by repair jobs — not user-facing)
  recalculateAggregates(workerProfileId: string): Promise<void>;
}

// ─── SEARCH SERVICE ───────────────────────────────────────────────────────────

export interface WorkerSearchResult {
  workerId: string;
  headline?: string;
  avgRating: number;
  totalReviews: number;
  jobsCompleted: number;
  distanceMeters?: number;
  isFeatured: boolean;
  tradeSlugs: string[];
  citySlug?: string;
}

export interface ISearchService {
  searchWorkers(params: { lat: number; lng: number; radiusKm?: number; tradeCategoryId?: string; q?: string; minRating?: number; isFeatured?: boolean }, pagination: { page: number; limit: number }): Promise<PaginatedResult<WorkerSearchResult>>;
  mapSearchWorkers(params: { neLat: number; neLng: number; swLat: number; swLng: number; tradeCategoryId?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<WorkerSearchResult>>;
  nearbyWorkers(params: { lat: number; lng: number; radiusKm: number; tradeCategoryId?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<WorkerSearchResult>>;
  getSuggestions(q: string): Promise<{ suggestions: string[] }>;
  getFeaturedWorkers(cityId?: string, tradeCategoryId?: string, pagination?: { page: number; limit: number }): Promise<PaginatedResult<WorkerSearchResult>>;
  getRecommendedWorkers(actor: ActorContext, pagination: { page: number; limit: number }): Promise<PaginatedResult<WorkerSearchResult>>;
  logImpression(data: { userId?: string; workerProfileId: string; rankPosition: number; queryText?: string; cityId?: string }): Promise<void>;

  // Index management — called by jobs, not by controllers
  indexWorker(workerProfileId: string): Promise<void>;
  removeWorkerFromIndex(workerProfileId: string): Promise<void>;
  fullReindex(): Promise<{ indexed: number; errors: number }>;
}

// ─── SOCIAL SERVICE ───────────────────────────────────────────────────────────

export interface ISocialService {
  createPost(actor: ActorContext, data: { body: string; visibility: string; mediaRefs?: string[] }): Promise<Post>;
  getFeed(actor: ActorContext, params: { since?: Date }, pagination: { page: number; limit: number }): Promise<PaginatedResult<Post & { author: UserProfile; media: any[] }>>;
  getPost(postId: string, actorUserId?: string): Promise<Post>;
  updatePost(actor: ActorContext, postId: string, data: { body?: string; visibility?: string }): Promise<Post>;
  deletePost(actor: ActorContext, postId: string): Promise<void>;
  addPostMedia(actor: ActorContext, postId: string, data: { mediaRef: string; mediaType: string }): Promise<void>;
  removePostMedia(actor: ActorContext, postId: string, mediaId: string): Promise<void>;
  likePost(actor: ActorContext, postId: string): Promise<void>;
  unlikePost(actor: ActorContext, postId: string): Promise<void>;
  savePost(actor: ActorContext, postId: string): Promise<void>;
  unsavePost(actor: ActorContext, postId: string): Promise<void>;

  createComment(actor: ActorContext, postId: string, data: { body: string; parentCommentId?: string }): Promise<Comment>;
  getComments(postId: string, pagination: { page: number; limit: number }): Promise<PaginatedResult<Comment>>;
  updateComment(actor: ActorContext, commentId: string, data: { body: string }): Promise<Comment>;
  deleteComment(actor: ActorContext, commentId: string): Promise<void>;
  likeComment(actor: ActorContext, commentId: string): Promise<void>;
  unlikeComment(actor: ActorContext, commentId: string): Promise<void>;
  reportComment(actor: ActorContext, commentId: string, data: { reason: string; severity?: string }): Promise<void>;
}

// ─── CHAT SERVICE ─────────────────────────────────────────────────────────────

export interface IChatService {
  createOrGetConversation(actor: ActorContext, data: { type: string; participantIds: string[]; serviceRequestId?: string }): Promise<Conversation>;
  getConversations(actor: ActorContext, pagination: { page: number; limit: number }): Promise<PaginatedResult<Conversation>>;
  getConversation(actor: ActorContext, conversationId: string): Promise<Conversation>;
  addParticipant(actor: ActorContext, conversationId: string, userId: string): Promise<void>;
  removeParticipant(actor: ActorContext, conversationId: string, userId: string): Promise<void>;
  getMessages(actor: ActorContext, conversationId: string, params: { before?: string; after?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<Message>>;
  sendMessage(actor: ActorContext, conversationId: string, data: { clientMessageId: string; messageType: string; body?: string; attachmentUploadRefs?: string[] }): Promise<Message>;
  addAttachment(actor: ActorContext, conversationId: string, messageId: string, data: { mediaRef: string }): Promise<void>;
  markRead(actor: ActorContext, conversationId: string, lastReadMessageId: string): Promise<void>;
  getUnreadCount(actor: ActorContext): Promise<{ count: number }>;
  reportMessage(actor: ActorContext, messageId: string, data: { reason: string }): Promise<void>;

  // Called by WebSocket gateway
  assertParticipant(userId: string, conversationId: string): Promise<boolean>;
}

// ─── SERVICE REQUESTS SERVICE ─────────────────────────────────────────────────

export interface IServiceRequestsService {
  createRequest(actor: ActorContext, data: any, idempotencyKey?: string): Promise<ServiceRequest>;
  getRequests(actor: ActorContext, params: { status?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<ServiceRequest>>;
  getRequest(actor: ActorContext, requestId: string): Promise<ServiceRequest>;
  updateRequest(actor: ActorContext, requestId: string, data: any): Promise<ServiceRequest>;
  addItem(actor: ActorContext, requestId: string, data: { label: string; quantity?: number; note?: string }): Promise<void>;
  updateItem(actor: ActorContext, requestId: string, itemId: string, data: any): Promise<void>;
  removeItem(actor: ActorContext, requestId: string, itemId: string): Promise<void>;
  acceptAssignment(actor: ActorContext, requestId: string, assignmentId: string): Promise<ServiceRequestAssignment>;
  declineAssignment(actor: ActorContext, requestId: string, assignmentId: string): Promise<ServiceRequestAssignment>;
  cancelRequest(actor: ActorContext, requestId: string, reason?: string): Promise<ServiceRequest>;
  expireRequest(requestId: string): Promise<void>; // called by system job
  getStatusHistory(actor: ActorContext, requestId: string): Promise<ServiceRequestStatusHistory[]>;

  // Internal — transition guard
  transitionStatus(requestId: string, toStatus: RequestStatus, changedByUserId?: string): Promise<void>;
}

// ─── BOOKINGS SERVICE ─────────────────────────────────────────────────────────

export interface IBookingsService {
  createBooking(actor: ActorContext, data: { serviceRequestId: string; scheduledStart: Date; scheduledEnd: Date }, idempotencyKey?: string): Promise<Booking>;
  getBookings(actor: ActorContext, params: { status?: string; from?: Date; to?: Date }, pagination: { page: number; limit: number }): Promise<PaginatedResult<Booking>>;
  getBooking(actor: ActorContext, bookingId: string): Promise<Booking>;
  confirmBooking(actor: ActorContext, bookingId: string): Promise<Booking>;
  startBooking(actor: ActorContext, bookingId: string): Promise<Booking>;
  completeBooking(actor: ActorContext, bookingId: string): Promise<Booking>;
  cancelBooking(actor: ActorContext, bookingId: string, reason?: string): Promise<Booking>;
  requestReschedule(actor: ActorContext, bookingId: string, data: { newStart: Date; newEnd: Date; reason?: string }): Promise<BookingReschedule>;
  respondToReschedule(actor: ActorContext, bookingId: string, rescheduleId: string, action: 'ACCEPT' | 'DECLINE'): Promise<BookingReschedule>;

  // Conflict detection
  checkConflict(workerProfileId: string, scheduledStart: Date, scheduledEnd: Date, excludeBookingId?: string): Promise<boolean>;
  // Called by auto-complete job
  autoCompleteOverdueBookings(): Promise<number>;
}

// ─── REVIEWS SERVICE ──────────────────────────────────────────────────────────

export interface IReviewsService {
  createReview(actor: ActorContext, data: { bookingId: string; rating: number; body?: string; dimensions?: { dimensionKey: string; score: number }[] }): Promise<Review>;
  getReview(reviewId: string): Promise<Review>;
  getWorkerReviews(workerProfileId: string, params: { minRating?: number }, pagination: { page: number; limit: number }): Promise<PaginatedResult<Review>>;
  addDimensions(actor: ActorContext, reviewId: string, dimensions: { dimensionKey: string; score: number }[]): Promise<ReviewDimensionScore[]>;
  createReply(actor: ActorContext, reviewId: string, body: string): Promise<void>;
  updateReply(actor: ActorContext, reviewId: string, replyId: string, body: string): Promise<void>;
  deleteReply(actor: ActorContext, reviewId: string, replyId: string): Promise<void>;
  reportReview(actor: ActorContext, reviewId: string, data: { reason: string; severity?: string }): Promise<void>;

  // Guard: booking must be COMPLETED and within review_window_hours
  assertReviewEligible(bookingId: string, reviewerUserId: string): Promise<void>;
}

// ─── MODERATION SERVICE ───────────────────────────────────────────────────────

export interface IModerationService {
  createReport(actor: ActorContext, data: { entityType: string; entityId: string; reason: string; severity?: string }): Promise<Report>;
  getReports(params: { status?: string; entityType?: string; severity?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<Report>>;
  getModerationCases(params: { status?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<ModerationCase>>;
  getModerationCase(caseId: string): Promise<ModerationCase>;
  addModerationAction(actor: ActorContext, caseId: string, data: { actionType: string; entityType: string; entityId: string; notes?: string }): Promise<void>;

  // Fraud
  createFraudSignal(data: { userId?: string; entityType?: string; entityId?: string; signalKey: string; score: number }): Promise<void>;
  evaluateFraudSignals(): Promise<void>; // job
}

// ─── NOTIFICATIONS SERVICE ────────────────────────────────────────────────────

export interface INotificationsService {
  createNotification(data: { userId: string; channel: string; notificationType: string; payloadJson: Record<string, any> }): Promise<Notification>;
  getNotifications(actor: ActorContext, params: { isRead?: boolean; channel?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<Notification>>;
  markRead(actor: ActorContext, notificationId: string): Promise<void>;
  markAllRead(actor: ActorContext): Promise<{ count: number }>;
  getPreferences(actor: ActorContext): Promise<NotificationPreference>;
  updatePreferences(actor: ActorContext, data: Partial<NotificationPreference>): Promise<NotificationPreference>;
  registerDevice(actor: ActorContext, data: { deviceToken: string; platform: string }): Promise<void>;
  unregisterDevice(actor: ActorContext, deviceId: string): Promise<void>;

  // Called by fanout job
  fanoutNotification(notificationId: string): Promise<void>;
  pruneStaleDevices(): Promise<number>; // job
}

// ─── BILLING SERVICE ──────────────────────────────────────────────────────────

export interface IBillingService {
  createPaymentIntent(actor: ActorContext, data: { type: string; bookingId?: string; durationDays?: number; currencyCode?: string }): Promise<PaymentIntent>;
  getPaymentIntent(actor: ActorContext, paymentIntentId: string): Promise<PaymentIntent>;
  confirmPaymentIntent(actor: ActorContext, paymentIntentId: string, data: { providerRef: string }): Promise<PaymentIntent>;
  handleProviderWebhook(rawBody: Buffer, signature: string, provider: string): Promise<void>;
  getMySubscription(actor: ActorContext): Promise<{ subscription: any | null; isActive: boolean }>;
  getMyInvoices(actor: ActorContext, pagination: { page: number; limit: number }): Promise<PaginatedResult<any>>;

  // Job
  expireSubscriptions(): Promise<number>;
  sendExpiryWarnings(): Promise<number>;
}

// ─── SUPPORT SERVICE ──────────────────────────────────────────────────────────

export interface ISupportService {
  createTicket(actor: ActorContext, data: { subject: string; body: string; priority?: string; relatedEntityType?: string; relatedEntityId?: string }): Promise<SupportTicket>;
  getTickets(actor: ActorContext, pagination: { page: number; limit: number }): Promise<PaginatedResult<SupportTicket>>;
  getTicket(actor: ActorContext, ticketId: string): Promise<SupportTicket & { messages: any[] }>;
  addMessage(actor: ActorContext, ticketId: string, data: { body: string; isInternalNote?: boolean }): Promise<void>;
  updateTicket(actor: ActorContext, ticketId: string, data: { status?: string }): Promise<SupportTicket>;

  // Admin
  adminListTickets(params: { status?: string; priority?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<SupportTicket>>;
  assignTicket(actor: ActorContext, ticketId: string, assignedSupportUserId: string): Promise<void>;
  updateTicketStatus(actor: ActorContext, ticketId: string, status: string): Promise<void>;
  autoCloseResolvedTickets(): Promise<number>; // job
}

// ─── ADMIN SERVICE ────────────────────────────────────────────────────────────

export interface IAdminService {
  // Users
  listUsers(params: { status?: string; q?: string; cityId?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<User>>;
  getUser(userId: string): Promise<User & { profile: UserProfile; adminRoles: AdminRoleKey[] }>;
  suspendUser(actor: ActorContext, userId: string, reason: string): Promise<void>;
  reactivateUser(actor: ActorContext, userId: string): Promise<void>;

  // Workers
  listWorkers(params: { verificationStatus?: string; q?: string }, pagination: { page: number; limit: number }): Promise<PaginatedResult<WorkerProfile>>;
  getWorkerAdmin(workerId: string): Promise<WorkerProfile>;
  verifyWorker(actor: ActorContext, workerId: string, notes?: string): Promise<void>;
  rejectVerification(actor: ActorContext, workerId: string, reviewNotes: string): Promise<void>;

  // Content
  deletePost(actor: ActorContext, postId: string): Promise<void>;
  deleteComment(actor: ActorContext, commentId: string): Promise<void>;
  deleteReview(actor: ActorContext, reviewId: string): Promise<void>;

  // Config & flags
  getConfigs(): Promise<SystemConfig[]>;
  updateConfig(actor: ActorContext, configKey: string, value: unknown): Promise<SystemConfig>;
  getFeatureFlags(): Promise<FeatureFlag[]>;
  updateFeatureFlag(actor: ActorContext, flagKey: string, data: { defaultEnabled?: boolean; rolloutJson?: any }): Promise<FeatureFlag>;

  // Cities
  getCities(): Promise<CityConfig[]>;
  createCity(actor: ActorContext, data: any): Promise<CityConfig>;
  updateCity(actor: ActorContext, cityId: string, data: any): Promise<CityConfig>;

  // RBAC management
  getRoles(): Promise<any[]>;
  getPermissions(): Promise<any[]>;
  updateRolePermissions(actor: ActorContext, roleId: string, permissionKeys: string[]): Promise<void>;
  assignAdminRole(actor: ActorContext, userId: string, roleKey: AdminRoleKey): Promise<void>;
  removeAdminRole(actor: ActorContext, userId: string, roleId: string): Promise<void>;

  // Audit logs
  getAuditLogs(params: { action?: string; entityType?: string; entityId?: string; adminUserId?: string; from?: Date; to?: Date }, pagination: { page: number; limit: number }): Promise<PaginatedResult<AuditLog>>;

  // Analytics
  getAnalyticsOverview(params: { from?: Date; to?: Date }): Promise<Record<string, any>>;
  getSearchAnalytics(params: { from?: Date; to?: Date }): Promise<Record<string, any>>;
  getEngagementAnalytics(params: { from?: Date; to?: Date }): Promise<Record<string, any>>;
}

// ─── MEDIA SERVICE ────────────────────────────────────────────────────────────

export interface IMediaService {
  requestUploadUrl(actor: ActorContext, data: { category: string; mimeType: string; sizeBytes: number; filename?: string }): Promise<{ uploadUrl: string; mediaId: string; storageKey: string }>;
  confirmUpload(actor: ActorContext, mediaId: string): Promise<{ cdnUrl: string; status: string }>;
  processImage(mediaId: string): Promise<{ variants: Record<string, string> }>;
  processVideo(mediaId: string): Promise<{ cdnUrl: string; posterUrl: string }>;
  scanForViruses(storageKey: string): Promise<{ clean: boolean; threat?: string }>;
  deleteMedia(mediaId: string): Promise<void>;
}
